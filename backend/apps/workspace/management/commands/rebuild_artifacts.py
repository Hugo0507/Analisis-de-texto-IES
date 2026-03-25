"""
Management command: rebuild_artifacts

Reconstruye los vectorizadores de BoW y TF-IDF desde los datos JSON
almacenados en la DB, los serializa con joblib y los guarda en BinaryField.

Esto permite restaurar la capacidad de inferencia SIN reentrenar los modelos,
usando el vocabulario e IDF que ya estan persistidos en PostgreSQL.

Uso:
    python manage.py rebuild_artifacts          # Reconstruir todo
    python manage.py rebuild_artifacts --bow    # Solo BoW
    python manage.py rebuild_artifacts --tfidf  # Solo TF-IDF
    python manage.py rebuild_artifacts --dry    # Solo mostrar que se haria

Notas:
    - Topic Modeling NO se puede reconstruir desde JSON (requiere reentrenamiento)
    - TF-IDF con vocabulario > 1000 terminos tendra reconstruccion parcial
      (idf_values en DB esta limitado a 1000 entradas)
"""

import io
import sys
import logging

import joblib
import numpy as np
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Reconstruye vectorizadores BoW/TF-IDF desde JSON en DB '
        'y los guarda en BinaryField para inferencia sin filesystem.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--bow', action='store_true',
            help='Solo reconstruir artefactos de Bag of Words',
        )
        parser.add_argument(
            '--tfidf', action='store_true',
            help='Solo reconstruir artefactos de TF-IDF',
        )
        parser.add_argument(
            '--dry', action='store_true',
            help='Solo mostrar que se reconstruiria, sin modificar la DB',
        )
        parser.add_argument(
            '--force', action='store_true',
            help='Reconstruir incluso si ya existe model_artifact_bin',
        )

    def handle(self, *args, **options):
        do_bow = options['bow']
        do_tfidf = options['tfidf']
        dry = options['dry']
        force = options['force']

        # Si no se especifica ninguno, hacer ambos
        if not do_bow and not do_tfidf:
            do_bow = True
            do_tfidf = True

        total_ok = 0
        total_skip = 0
        total_fail = 0

        if do_bow:
            ok, skip, fail = self._rebuild_bow(dry, force)
            total_ok += ok
            total_skip += skip
            total_fail += fail

        if do_tfidf:
            ok, skip, fail = self._rebuild_tfidf(dry, force)
            total_ok += ok
            total_skip += skip
            total_fail += fail

        # Resumen
        self.stdout.write('')
        self.stdout.write('=' * 60)
        self.stdout.write(
            f'RESUMEN: {total_ok} reconstruidos, '
            f'{total_skip} omitidos, {total_fail} fallidos'
        )
        if dry:
            self.stdout.write('(modo --dry: no se modifico la DB)')
        self.stdout.write('=' * 60)

        if total_fail > 0:
            self.stdout.write(
                '\nNOTA: Para Topic Modeling, los artefactos NO se pueden '
                'reconstruir desde JSON. Es necesario reejecutar el analisis '
                'desde el frontend para que se guarden en BinaryField.'
            )

    # ──────────────────────────────────────────────────────────────
    # BoW
    # ──────────────────────────────────────────────────────────────
    def _rebuild_bow(self, dry, force):
        from apps.bag_of_words.models import BagOfWords
        from sklearn.feature_extraction.text import CountVectorizer

        qs = BagOfWords.objects.filter(status=BagOfWords.STATUS_COMPLETED)
        self.stdout.write(f'\n--- Bag of Words ({qs.count()} completados) ---')

        ok = skip = fail = 0

        for bow in qs:
            label = f'BoW #{bow.id} "{bow.name}"'

            # Ya tiene artefacto binario?
            if bow.model_artifact_bin and not force:
                self.stdout.write(f'  SKIP {label} (ya tiene BinaryField)')
                skip += 1
                continue

            # Necesitamos vocabulary completo
            vocab = bow.vocabulary  # dict {term: index}
            if not vocab or not isinstance(vocab, dict) or len(vocab) == 0:
                self.stdout.write(f'  FAIL {label} (sin vocabulario en DB)')
                fail += 1
                continue

            vocab_size = len(vocab)

            if dry:
                self.stdout.write(
                    f'  DRY  {label} -> reconstruiria CountVectorizer '
                    f'({vocab_size} terminos)'
                )
                ok += 1
                continue

            try:
                # Reconstruir CountVectorizer
                cv = CountVectorizer()
                cv.vocabulary_ = vocab
                # fixed_vocabulary_ indica que el vocabulario fue provisto
                cv.fixed_vocabulary_ = True

                # Serializar
                buf = io.BytesIO()
                joblib.dump(cv, buf)
                buf.seek(0)
                bow.model_artifact_bin = buf.read()
                bow.save(update_fields=['model_artifact_bin'])

                size_kb = len(bow.model_artifact_bin) / 1024
                self.stdout.write(
                    f'  OK   {label} -> CountVectorizer reconstruido '
                    f'({vocab_size} terminos, {size_kb:.1f} KB)'
                )
                ok += 1

            except Exception as e:
                self.stdout.write(f'  FAIL {label} -> {e}')
                fail += 1

        return ok, skip, fail

    # ──────────────────────────────────────────────────────────────
    # TF-IDF
    # ──────────────────────────────────────────────────────────────
    def _rebuild_tfidf(self, dry, force):
        from apps.tfidf_analysis.models import TfIdfAnalysis
        from sklearn.feature_extraction.text import TfidfVectorizer

        qs = TfIdfAnalysis.objects.filter(status=TfIdfAnalysis.STATUS_COMPLETED)
        self.stdout.write(f'\n--- TF-IDF ({qs.count()} completados) ---')

        ok = skip = fail = 0

        for tfidf in qs:
            label = f'TF-IDF #{tfidf.id} "{tfidf.name}"'

            # Ya tiene artefacto binario?
            if tfidf.vectorizer_artifact_bin and not force:
                self.stdout.write(f'  SKIP {label} (ya tiene BinaryField)')
                skip += 1
                continue

            # Necesitamos idf_values del idf_vector JSON
            idf_data = tfidf.idf_vector
            if not idf_data or not isinstance(idf_data, dict):
                self.stdout.write(f'  FAIL {label} (sin idf_vector en DB)')
                fail += 1
                continue

            idf_values = idf_data.get('idf_values', {})
            if not idf_values or len(idf_values) == 0:
                self.stdout.write(f'  FAIL {label} (idf_values vacio)')
                fail += 1
                continue

            vocab_size = len(idf_values)
            full_vocab_size = tfidf.vocabulary_size

            # Advertencia si el vocabulario esta truncado
            partial = vocab_size < full_vocab_size
            partial_note = ''
            if partial:
                partial_note = (
                    f' [PARCIAL: {vocab_size}/{full_vocab_size} terminos - '
                    f'idf_values limitado a 1000 en DB]'
                )

            if dry:
                self.stdout.write(
                    f'  DRY  {label} -> reconstruiria TfidfVectorizer '
                    f'({vocab_size} terminos){partial_note}'
                )
                ok += 1
                continue

            try:
                # Reconstruir vocabulario {term: index} ordenado
                sorted_terms = sorted(idf_values.keys())
                vocabulary = {term: idx for idx, term in enumerate(sorted_terms)}

                # Reconstruir vector IDF en el orden correcto
                idf_array = np.array(
                    [idf_values[term] for term in sorted_terms],
                    dtype=np.float64
                )

                # Reconstruir TfidfVectorizer
                tv = TfidfVectorizer(
                    use_idf=tfidf.use_idf,
                    smooth_idf=tfidf.smooth_idf,
                    sublinear_tf=tfidf.sublinear_tf,
                    norm='l2',
                )
                tv.vocabulary_ = vocabulary
                tv.idf_ = idf_array
                tv.fixed_vocabulary_ = True
                # _tfidf es el transformador interno que necesita idf_
                # Configurar el transformador TF-IDF interno
                from sklearn.feature_extraction.text import TfidfTransformer
                transformer = TfidfTransformer(
                    use_idf=tfidf.use_idf,
                    smooth_idf=tfidf.smooth_idf,
                    sublinear_tf=tfidf.sublinear_tf,
                    norm='l2',
                )
                transformer.idf_ = idf_array
                tv._tfidf = transformer

                # Serializar
                buf = io.BytesIO()
                joblib.dump(tv, buf)
                buf.seek(0)
                tfidf.vectorizer_artifact_bin = buf.read()
                tfidf.save(update_fields=['vectorizer_artifact_bin'])

                size_kb = len(tfidf.vectorizer_artifact_bin) / 1024
                self.stdout.write(
                    f'  OK   {label} -> TfidfVectorizer reconstruido '
                    f'({vocab_size} terminos, {size_kb:.1f} KB){partial_note}'
                )
                ok += 1

            except Exception as e:
                self.stdout.write(f'  FAIL {label} -> {e}')
                fail += 1

        return ok, skip, fail
