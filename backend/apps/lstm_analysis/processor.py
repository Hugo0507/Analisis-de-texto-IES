"""
LSTM Processor

Pipeline de 8 etapas para entrenar un clasificador LSTM de documentos.

Arquitectura: Embedding -> LSTM -> Linear -> Softmax
Entrenamiento: CrossEntropyLoss con pesos por clase + Adam

Qué se clasifica: el tema dominante de cada documento o su factor OE3
(label_mode). Unidad de entrenamiento: el documento completo o fragmentos de
`fragment_words` palabras. La partición, las métricas y la línea base están en
datos.py; aquí solo vive lo que necesita PyTorch.
"""

import logging
import traceback
import time
from typing import List, Dict, Tuple, Any
import numpy as np
from collections import Counter

from django.utils import timezone
from django.db import transaction
from apps.core.background import run_in_background

from .datos import (
    dividir_por_documento,
    etiquetas_oe3,
    fragmentar,
    linea_base,
    metricas,
    pesos_por_clase,
    prediccion_por_documento,
)

logger = logging.getLogger(__name__)


def start_processing_thread(lstm_id: int):
    """Lanza el procesamiento de LSTM en segundo plano."""
    return run_in_background(process_lstm_analysis, lstm_id, label=f'LSTM #{lstm_id}')


def process_lstm_analysis(lstm_id: int):
    """
    Pipeline completo de entrenamiento LSTM.

    Etapas:
    1. Cargando datos y etiquetas        (10%)
    2. Construyendo vocabulario          (20%)
    3. Codificando secuencias            (35%)
    4. Preparando conjuntos de datos     (45%)
    5. Entrenando modelo LSTM            (45-88%)
    6. Evaluando modelo                  (92%)
    7. Guardando resultados              (97%)
    8. Completado                        (100%)
    """
    from .models import LstmAnalysis

    try:
        lstm = LstmAnalysis.objects.get(id=lstm_id)
        logger.info(f"[LSTM] Iniciando: {lstm.name}")

        lstm.status = LstmAnalysis.STATUS_PROCESSING
        lstm.current_stage = LstmAnalysis.STAGE_LOADING_DATA
        lstm.progress_percentage = 5
        lstm.processing_started_at = timezone.now()
        lstm.save()

        t_start = time.time()

        # ── ETAPA 1: CARGAR DOCUMENTOS Y ETIQUETAS ─────────────────
        lstm.progress_percentage = 10
        lstm.save()

        textos_doc, etiquetas_doc, class_names = load_data(lstm)
        n_docs = len(textos_doc)
        n_classes = len(class_names)

        if n_docs < 10:
            raise ValueError(
                f"Se necesitan al menos 10 documentos etiquetados. "
                f"Solo se encontraron {n_docs}."
            )
        # Con una sola clase (p. ej. en 'oe3' todos los temas caen en el mismo
        # factor) no hay nada que clasificar: exactitud y línea base darían 1.0.
        if n_classes < 2:
            raise ValueError(
                f"Se necesitan al menos 2 clases para clasificar. "
                f"Solo se encontró: {class_names}."
            )
        logger.info(f"[LSTM] {n_docs} docs, {n_classes} clases: {class_names}")

        # ── ETAPA 4 (antes que el vocabulario): PARTICIÓN POR DOCUMENTO ──
        # Se parte por documento antes de fragmentar para que ningún artículo
        # tenga fragmentos en entrenamiento y en prueba a la vez.
        docs_train, docs_test = dividir_por_documento(etiquetas_doc, lstm.train_split)
        if not docs_test:
            raise ValueError('No quedaron documentos para la prueba: hay muy pocos por clase.')

        X_train_txt, y_train, _ = construir_ejemplos(
            docs_train, textos_doc, etiquetas_doc, lstm.fragment_words)
        X_test_txt, y_test, doc_de_ejemplo = construir_ejemplos(
            docs_test, textos_doc, etiquetas_doc, lstm.fragment_words)
        logger.info(
            f"[LSTM] Documentos train/test: {len(docs_train)}/{len(docs_test)} · "
            f"ejemplos: {len(X_train_txt)}/{len(X_test_txt)}")

        # ── ETAPA 2: VOCABULARIO (solo con entrenamiento) ──────────
        lstm.current_stage = LstmAnalysis.STAGE_BUILDING_VOCAB
        lstm.progress_percentage = 20
        lstm.save()

        word2idx, vocab_size = build_vocabulary(X_train_txt, lstm.max_vocab_size)

        # ── ETAPA 3: CODIFICAR ─────────────────────────────────────
        lstm.current_stage = LstmAnalysis.STAGE_ENCODING_SEQUENCES
        lstm.progress_percentage = 35
        lstm.save()

        largo = max_sequence_length(lstm)
        X_train = encode_texts(X_train_txt, word2idx, largo)
        X_test = encode_texts(X_test_txt, word2idx, largo)

        # ── ETAPA 5: ENTRENAR ──────────────────────────────────────
        lstm.current_stage = LstmAnalysis.STAGE_PREPARING_DATASETS
        lstm.progress_percentage = 45
        lstm.save()
        lstm.current_stage = LstmAnalysis.STAGE_TRAINING
        lstm.save()

        model, loss_history = train_lstm(
            lstm, X_train, np.array(y_train, dtype=np.int64), vocab_size, n_classes,
            pesos_por_clase(y_train, n_classes),
        )

        # ── ETAPA 6: EVALUAR ───────────────────────────────────────
        lstm.current_stage = LstmAnalysis.STAGE_EVALUATING
        lstm.progress_percentage = 92
        lstm.save()

        probabilidades = predict_proba(model, X_test, lstm.batch_size)
        pred_ejemplo = [int(np.argmax(p)) for p in probabilidades]

        # Métrica principal: por documento (con fragmentos, se promedian)
        pred_doc = prediccion_por_documento(probabilidades, doc_de_ejemplo)
        y_test_doc = [etiquetas_doc[d] for d in docs_test]
        y_pred_doc = [pred_doc[d] for d in docs_test]
        resultado_doc = metricas(y_test_doc, y_pred_doc, class_names)
        base = linea_base([etiquetas_doc[d] for d in docs_train], y_test_doc, class_names)

        resultado_fragmentos = (
            metricas(y_test, pred_ejemplo, class_names) if lstm.fragment_words > 0 else None
        )
        t_elapsed = time.time() - t_start
        logger.info(
            f"[LSTM] Por documento: exactitud {resultado_doc['accuracy']:.4f}, "
            f"F1 macro {resultado_doc['macro_f1']:.4f} · línea base "
            f"{base['accuracy']:.4f} / {base['macro_f1']:.4f}")

        # ── ETAPA 7: GUARDAR ───────────────────────────────────────
        lstm.current_stage = LstmAnalysis.STAGE_SAVING_RESULTS
        lstm.progress_percentage = 97
        lstm.save()

        model_bytes = serialize_model(model)

        with transaction.atomic():
            lstm.accuracy = round(float(resultado_doc['accuracy']), 4)
            lstm.macro_f1 = round(float(resultado_doc['macro_f1']), 4)
            lstm.baseline_accuracy = round(float(base['accuracy']), 4)
            lstm.baseline_macro_f1 = round(float(base['macro_f1']), 4)
            # Sin fragmentos se dejan en null de forma explícita, para no
            # arrastrar valores de una ejecución anterior del mismo registro.
            lstm.fragment_accuracy = lstm.fragment_macro_f1 = None
            if resultado_fragmentos:
                lstm.fragment_accuracy = round(float(resultado_fragmentos['accuracy']), 4)
                lstm.fragment_macro_f1 = round(float(resultado_fragmentos['macro_f1']), 4)
            lstm.training_time_seconds = round(t_elapsed, 2)
            lstm.documents_used = n_docs
            lstm.samples_used = len(X_train_txt) + len(X_test_txt)
            lstm.num_classes = n_classes
            lstm.vocab_size_actual = vocab_size
            lstm.loss_history = [round(float(v), 4) for v in loss_history]
            lstm.confusion_matrix = resultado_doc['matriz']
            lstm.classification_report = resultado_doc['reporte']
            lstm.class_labels = class_names
            lstm.model_artifact_bin = model_bytes
            lstm.status = LstmAnalysis.STATUS_COMPLETED
            lstm.current_stage = LstmAnalysis.STAGE_COMPLETED
            lstm.progress_percentage = 100
            lstm.processing_completed_at = timezone.now()
            lstm.save()

        logger.info("[LSTM] Análisis completado")

    except Exception as e:
        logger.error(f"[LSTM] Error: {e}")
        logger.error(traceback.format_exc())
        try:
            lstm = LstmAnalysis.objects.get(id=lstm_id)
            lstm.status = LstmAnalysis.STATUS_ERROR
            lstm.error_message = f"{type(e).__name__}: {e}"
            lstm.save()
        except Exception:
            pass


# ── FUNCIONES AUXILIARES ────────────────────────────────────────────────────

def load_data(lstm) -> Tuple[List[str], List[int], List[str]]:
    """
    Textos preprocesados del DataPreparation y etiqueta de cada documento.

    Con label_mode 'topic' la etiqueta es el tema dominante; con 'oe3', el
    factor del marco OE3 al que pertenece ese tema dominante.

    Retorna (textos, etiquetas_int, nombres_de_clase), un elemento por documento.
    """
    from apps.datasets.models import DatasetFile
    from apps.topic_modeling.factors import OE3_CATEGORIES

    dp = lstm.data_preparation
    tm = lstm.topic_modeling

    # Sin duplicados: processed_file_ids se amplía con extend() al actualizar la
    # preparación, y un id repetido sería "dos documentos" con el mismo texto que
    # la partición podría mandar uno a entrenamiento y otro a prueba (fuga).
    file_ids = list(dict.fromkeys(dp.processed_file_ids or []))
    files_qs = DatasetFile.objects.filter(id__in=file_ids).only('id', 'preprocessed_text')
    text_map: Dict[int, str] = {
        f.id: f.preprocessed_text
        for f in files_qs
        if f.preprocessed_text and f.preprocessed_text.strip()
    }

    # Tema dominante por documento
    tema_de: Dict[int, int] = {}
    for entry in (tm.document_topics or []):
        doc_id = entry.get('document_id')
        dominant = entry.get('dominant_topic')
        if doc_id is not None and dominant is not None and dominant != -1:
            tema_de[doc_id] = int(dominant)

    if lstm.label_mode == lstm.LABELS_OE3:
        factor_de_tema = etiquetas_oe3(tm.topics)
        clave_de = {doc: factor_de_tema[t][0] for doc, t in tema_de.items() if t in factor_de_tema}
        nombre_de = {cat['id']: cat['label'] for cat in OE3_CATEGORIES}
        # Orden de las clases: el del marco OE3
        orden = [cat['id'] for cat in OE3_CATEGORIES]
    else:
        clave_de = dict(tema_de)
        nombre_de = {
            t['topic_id']: t.get('topic_label', f'Tema {t["topic_id"]}') for t in (tm.topics or [])
        }
        orden = sorted(set(clave_de.values()))

    texts: List[str] = []
    claves: List = []
    for file_id in file_ids:
        if file_id in text_map and file_id in clave_de:
            texts.append(text_map[file_id])
            claves.append(clave_de[file_id])

    if not texts:
        raise ValueError(
            "No se encontraron documentos con texto Y etiqueta. "
            "Verifica que el modelo de temas y la preparación usan los mismos documentos."
        )

    # Solo las clases que tienen documentos, reindexadas 0..N-1
    presentes = [c for c in orden if c in set(claves)]
    indice = {c: i for i, c in enumerate(presentes)}
    labels = [indice[c] for c in claves]
    class_names = [nombre_de.get(c, str(c)) for c in presentes]
    return texts, labels, class_names


def construir_ejemplos(
    documentos: List[int], textos: List[str], etiquetas: List[int], palabras: int,
) -> Tuple[List[str], List[int], List[int]]:
    """Ejemplos (fragmentos o documentos), su etiqueta y el documento de origen."""
    X: List[str] = []
    y: List[int] = []
    origen: List[int] = []
    for d in documentos:
        for fragmento in fragmentar(textos[d], palabras):
            X.append(fragmento)
            y.append(etiquetas[d])
            origen.append(d)
    return X, y, origen


def max_sequence_length(lstm) -> int:
    """Con fragmentos, la secuencia no necesita ser más larga que el fragmento."""
    if lstm.fragment_words > 0:
        return min(lstm.max_seq_length, lstm.fragment_words + lstm.fragment_words // 2)
    return lstm.max_seq_length


def build_vocabulary(texts: List[str], max_vocab_size: int) -> Tuple[Dict[str, int], int]:
    """
    Construye word2idx con las top-N palabras más frecuentes.
    Índice 0 = PAD, índice 1 = UNK.
    """
    counter: Counter = Counter()
    for text in texts:
        counter.update(text.lower().split())

    word2idx: Dict[str, int] = {'<PAD>': 0, '<UNK>': 1}
    for word, _ in counter.most_common(max_vocab_size - 2):
        word2idx[word] = len(word2idx)

    return word2idx, len(word2idx)


def encode_texts(
    texts: List[str], word2idx: Dict[str, int], max_seq_length: int
) -> np.ndarray:
    """
    Convierte textos a matrices de índices con padding/truncamiento.
    Retorna np.ndarray de shape (n_docs, max_seq_length).
    """
    unk_idx = word2idx.get('<UNK>', 1)
    X = np.zeros((len(texts), max_seq_length), dtype=np.int64)
    for i, text in enumerate(texts):
        tokens = text.lower().split()[:max_seq_length]
        for j, token in enumerate(tokens):
            X[i, j] = word2idx.get(token, unk_idx)
    return X


def train_lstm(
    lstm, X_train: np.ndarray, y_train: np.ndarray,
    vocab_size: int, n_classes: int, pesos: List[float],
) -> Tuple[Any, List[float]]:
    """
    Define y entrena el modelo LSTM con PyTorch.
    Actualiza el progreso en DB por época.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import TensorDataset, DataLoader
    from .models import LstmAnalysis

    torch.manual_seed(42)
    device = torch.device('cpu')

    from torch.nn.utils.rnn import pack_padded_sequence, pad_packed_sequence

    class LSTMClassifier(nn.Module):
        """
        LSTM bidireccional sobre secuencias empaquetadas.

        La versión anterior leía el último estado oculto de una secuencia con
        el relleno al final: tras ~150 pasos de relleno ese estado era casi
        igual para cualquier texto, la pérdida se quedaba en ln(n_clases) y el
        modelo respondía siempre la misma clase. Empaquetar hace que la LSTM
        se detenga en la última palabra real de cada ejemplo.
        """

        def __init__(self, vocab_sz, emb_dim, hid_dim, n_layers, n_cls):
            super().__init__()
            self.embedding = nn.Embedding(vocab_sz, emb_dim, padding_idx=0)
            self.lstm = nn.LSTM(
                emb_dim, hid_dim, num_layers=n_layers, bidirectional=True,
                batch_first=True, dropout=0.3 if n_layers > 1 else 0.0,
            )
            self.dropout = nn.Dropout(0.3)
            # Estados finales de ambas direcciones + promedio de las salidas
            self.fc = nn.Linear(hid_dim * 4, n_cls)

        def forward(self, x):
            longitudes = (x != 0).sum(dim=1).clamp(min=1)
            emb = self.embedding(x)
            empaquetado = pack_padded_sequence(
                emb, longitudes.cpu(), batch_first=True, enforce_sorted=False)
            salidas, (hidden, _) = self.lstm(empaquetado)
            salidas, _ = pad_packed_sequence(
                salidas, batch_first=True, total_length=x.size(1))
            mascara = (x != 0).unsqueeze(-1).float()
            promedio = (salidas * mascara).sum(dim=1) / longitudes.unsqueeze(-1).float()
            finales = torch.cat([hidden[-2], hidden[-1]], dim=1)
            return self.fc(self.dropout(torch.cat([finales, promedio], dim=1)))

    model = LSTMClassifier(
        vocab_size, lstm.embedding_dim, lstm.hidden_dim,
        lstm.num_layers, n_classes,
    ).to(device)

    # Pesos inversos a la frecuencia: sin ellos el modelo aprende a responder
    # la clase mayoritaria.
    criterion = nn.CrossEntropyLoss(weight=torch.tensor(pesos, dtype=torch.float32))
    optimizer = torch.optim.Adam(model.parameters(), lr=lstm.learning_rate)

    X_t = torch.tensor(X_train, dtype=torch.long)
    y_t = torch.tensor(y_train, dtype=torch.long)
    loader = DataLoader(TensorDataset(X_t, y_t), batch_size=lstm.batch_size, shuffle=True)

    loss_history: List[float] = []

    for epoch in range(lstm.num_epochs):
        model.train()
        epoch_loss = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            loss = criterion(model(xb), yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            epoch_loss += loss.item()

        avg_loss = epoch_loss / max(len(loader), 1)
        loss_history.append(avg_loss)

        # Actualizar progreso: 45% → 88% a lo largo de las épocas
        pct = 45 + int(((epoch + 1) / lstm.num_epochs) * 43)
        try:
            LstmAnalysis.objects.filter(id=lstm.id).update(progress_percentage=pct)
        except Exception:
            pass

        if (epoch + 1) % 5 == 0 or epoch == 0:
            logger.info(f"  Época {epoch + 1}/{lstm.num_epochs} — loss: {avg_loss:.4f}")

    return model, loss_history


def predict_proba(model: Any, X: np.ndarray, batch_size: int) -> np.ndarray:
    """Probabilidades por clase (softmax) para cada ejemplo."""
    import torch
    from torch.utils.data import TensorDataset, DataLoader

    model.eval()
    loader = DataLoader(TensorDataset(torch.tensor(X, dtype=torch.long)),
                        batch_size=batch_size, shuffle=False)
    partes = []
    with torch.no_grad():
        for (xb,) in loader:
            partes.append(torch.softmax(model(xb), dim=1).cpu().numpy())
    return np.concatenate(partes) if partes else np.zeros((0, 0))


def serialize_model(model: Any) -> bytes:
    """Serializa el modelo PyTorch a bytes con torch.save."""
    import torch
    import io
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    return buf.getvalue()
