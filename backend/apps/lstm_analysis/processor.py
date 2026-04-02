"""
LSTM Processor

Pipeline de 8 etapas para entrenar un clasificador LSTM de documentos por tema.

Arquitectura: Embedding -> LSTM -> Linear -> Softmax
Entrenamiento: CrossEntropyLoss + Adam
"""

import logging
import threading
import traceback
import time
from typing import List, Dict, Tuple, Any
import numpy as np
from collections import Counter

from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


def start_processing_thread(lstm_id: int):
    """Inicia el procesamiento LSTM en un hilo daemon."""
    thread = threading.Thread(
        target=process_lstm_analysis,
        args=(lstm_id,),
        daemon=True,
    )
    thread.start()
    logger.info(f"🚀 [LSTM] Thread iniciado para análisis #{lstm_id}")


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
        logger.info(f"🔍 [LSTM] Iniciando: {lstm.name}")

        lstm.status = LstmAnalysis.STATUS_PROCESSING
        lstm.current_stage = LstmAnalysis.STAGE_LOADING_DATA
        lstm.progress_percentage = 5
        lstm.processing_started_at = timezone.now()
        lstm.save()

        t_start = time.time()

        # ── ETAPA 1: CARGAR DATOS ──────────────────────────────────
        logger.info("[LSTM] Etapa 1/8: Cargando datos y etiquetas...")
        lstm.progress_percentage = 10
        lstm.save()

        texts, labels, class_names = load_data(lstm)
        n_docs = len(texts)
        n_classes = len(class_names)

        if n_docs < 10:
            raise ValueError(
                f"Se necesitan al menos 10 documentos etiquetados. "
                f"Solo se encontraron {n_docs}."
            )

        logger.info(f"✅ [LSTM] {n_docs} docs, {n_classes} clases: {class_names}")

        # ── ETAPA 2: CONSTRUIR VOCABULARIO ─────────────────────────
        logger.info("[LSTM] Etapa 2/8: Construyendo vocabulario...")
        lstm.current_stage = LstmAnalysis.STAGE_BUILDING_VOCAB
        lstm.progress_percentage = 20
        lstm.save()

        word2idx, vocab_size = build_vocabulary(texts, lstm.max_vocab_size)
        logger.info(f"✅ [LSTM] Vocabulario: {vocab_size} palabras")

        # ── ETAPA 3: CODIFICAR SECUENCIAS ──────────────────────────
        logger.info("[LSTM] Etapa 3/8: Codificando secuencias...")
        lstm.current_stage = LstmAnalysis.STAGE_ENCODING_SEQUENCES
        lstm.progress_percentage = 35
        lstm.save()

        X = encode_texts(texts, word2idx, lstm.max_seq_length)
        y = np.array(labels, dtype=np.int64)
        logger.info(f"✅ [LSTM] Secuencias: {X.shape}, etiquetas: {y.shape}")

        # ── ETAPA 4: PREPARAR DATASETS ─────────────────────────────
        logger.info("[LSTM] Etapa 4/8: Preparando datasets...")
        lstm.current_stage = LstmAnalysis.STAGE_PREPARING_DATASETS
        lstm.progress_percentage = 45
        lstm.save()

        X_train, X_test, y_train, y_test = split_data(X, y, lstm.train_split)
        logger.info(f"✅ [LSTM] Train: {len(X_train)}, Test: {len(X_test)}")

        # ── ETAPA 5: ENTRENAR ──────────────────────────────────────
        logger.info("[LSTM] Etapa 5/8: Entrenando modelo LSTM...")
        lstm.current_stage = LstmAnalysis.STAGE_TRAINING
        lstm.progress_percentage = 45
        lstm.save()

        model, loss_history = train_lstm(
            lstm, X_train, y_train, vocab_size, n_classes
        )
        logger.info(f"✅ [LSTM] Entrenamiento completo. Loss final: {loss_history[-1]:.4f}")

        # ── ETAPA 6: EVALUAR ───────────────────────────────────────
        logger.info("[LSTM] Etapa 6/8: Evaluando modelo...")
        lstm.current_stage = LstmAnalysis.STAGE_EVALUATING
        lstm.progress_percentage = 92
        lstm.save()

        accuracy, conf_matrix, clf_report = evaluate_model(
            model, X_test, y_test, n_classes, class_names, lstm.batch_size
        )
        t_elapsed = time.time() - t_start
        logger.info(f"✅ [LSTM] Accuracy: {accuracy:.4f}")

        # ── ETAPA 7: GUARDAR ───────────────────────────────────────
        logger.info("[LSTM] Etapa 7/8: Guardando resultados...")
        lstm.current_stage = LstmAnalysis.STAGE_SAVING_RESULTS
        lstm.progress_percentage = 97
        lstm.save()

        model_bytes = serialize_model(model)

        with transaction.atomic():
            lstm.accuracy = round(float(accuracy), 4)
            lstm.training_time_seconds = round(t_elapsed, 2)
            lstm.documents_used = n_docs
            lstm.num_classes = n_classes
            lstm.vocab_size_actual = vocab_size
            lstm.loss_history = [round(float(v), 4) for v in loss_history]
            lstm.confusion_matrix = conf_matrix
            lstm.classification_report = clf_report
            lstm.class_labels = class_names
            lstm.model_artifact_bin = model_bytes
            lstm.status = LstmAnalysis.STATUS_COMPLETED
            lstm.current_stage = LstmAnalysis.STAGE_COMPLETED
            lstm.progress_percentage = 100
            lstm.processing_completed_at = timezone.now()
            lstm.save()

        logger.info(f"✅ [LSTM] Análisis completado exitosamente")

    except Exception as e:
        logger.error(f"❌ [LSTM] Error: {e}")
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
    Carga textos preprocesados del DataPreparation y etiquetas del TopicModeling.
    Retorna (textos, etiquetas_int, nombres_de_clase).
    """
    from apps.datasets.models import DatasetFile

    dp = lstm.data_preparation
    tm = lstm.topic_modeling

    # Textos: DataPreparation → DatasetFile.preprocessed_text
    file_ids = dp.processed_file_ids or []
    files_qs = DatasetFile.objects.filter(id__in=file_ids)
    text_map: Dict[int, str] = {
        f.id: f.preprocessed_text
        for f in files_qs
        if f.preprocessed_text and f.preprocessed_text.strip()
    }

    # Etiquetas: TopicModeling.document_topics → dominant_topic por doc_id
    label_map: Dict[int, int] = {}
    for entry in (tm.document_topics or []):
        doc_id = entry.get('document_id')
        dominant = entry.get('dominant_topic')
        if doc_id is not None and dominant is not None and dominant != -1:
            label_map[doc_id] = int(dominant)

    # Mapear topic_id → topic_label
    topic_label_map: Dict[int, str] = {}
    for topic in (tm.topics or []):
        topic_label_map[topic['topic_id']] = topic.get('topic_label', f'Tema {topic["topic_id"]}')

    # Intersección: solo documentos con texto Y etiqueta
    texts: List[str] = []
    raw_labels: List[int] = []
    for file_id in file_ids:
        if file_id in text_map and file_id in label_map:
            texts.append(text_map[file_id])
            raw_labels.append(label_map[file_id])

    if not texts:
        raise ValueError(
            "No se encontraron documentos con texto Y etiqueta de tema. "
            "Verifica que el TopicModeling y el DataPreparation usan los mismos documentos."
        )

    # Reindexar etiquetas a enteros secuenciales 0..N-1
    unique_ids = sorted(set(raw_labels))
    id_to_idx = {tid: idx for idx, tid in enumerate(unique_ids)}
    labels = [id_to_idx[t] for t in raw_labels]
    class_names = [topic_label_map.get(tid, f'Tema {tid}') for tid in unique_ids]

    return texts, labels, class_names


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


def split_data(
    X: np.ndarray, y: np.ndarray, train_split: float, seed: int = 42
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """División aleatoria reproducible en train/test."""
    rng = np.random.default_rng(seed)
    idx = rng.permutation(len(X))
    n_train = int(len(X) * train_split)
    train_idx, test_idx = idx[:n_train], idx[n_train:]
    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]


def train_lstm(
    lstm, X_train: np.ndarray, y_train: np.ndarray,
    vocab_size: int, n_classes: int
) -> Tuple[Any, List[float]]:
    """
    Define y entrena el modelo LSTM con PyTorch.
    Actualiza el progreso en DB por época.
    """
    import torch
    import torch.nn as nn
    from torch.utils.data import TensorDataset, DataLoader
    from .models import LstmAnalysis

    device = torch.device('cpu')

    class LSTMClassifier(nn.Module):
        def __init__(self, vocab_sz, emb_dim, hid_dim, n_layers, n_cls):
            super().__init__()
            self.embedding = nn.Embedding(vocab_sz, emb_dim, padding_idx=0)
            self.lstm = nn.LSTM(
                emb_dim, hid_dim, num_layers=n_layers,
                batch_first=True, dropout=0.3 if n_layers > 1 else 0.0,
            )
            self.fc = nn.Linear(hid_dim, n_cls)

        def forward(self, x):
            emb = self.embedding(x)
            _, (hidden, _) = self.lstm(emb)
            out = self.fc(hidden[-1])
            return out

    model = LSTMClassifier(
        vocab_size, lstm.embedding_dim, lstm.hidden_dim,
        lstm.num_layers, n_classes,
    ).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=lstm.learning_rate)

    X_t = torch.tensor(X_train, dtype=torch.long)
    y_t = torch.tensor(y_train, dtype=torch.long)
    dataset = TensorDataset(X_t, y_t)
    loader = DataLoader(dataset, batch_size=lstm.batch_size, shuffle=True)

    loss_history: List[float] = []

    for epoch in range(lstm.num_epochs):
        model.train()
        epoch_loss = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            preds = model(xb)
            loss = criterion(preds, yb)
            loss.backward()
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


def evaluate_model(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    n_classes: int,
    class_names: List[str],
    batch_size: int,
) -> Tuple[float, List[List[int]], Dict]:
    """
    Evalúa el modelo en el conjunto de test.
    Retorna (accuracy, confusion_matrix, classification_report).
    """
    import torch
    from torch.utils.data import TensorDataset, DataLoader

    device = torch.device('cpu')
    model.eval()

    X_t = torch.tensor(X_test, dtype=torch.long)
    y_t = torch.tensor(y_test, dtype=torch.long)
    loader = DataLoader(TensorDataset(X_t, y_t), batch_size=batch_size, shuffle=False)

    all_preds: List[int] = []
    all_true: List[int] = []

    with torch.no_grad():
        for xb, yb in loader:
            xb = xb.to(device)
            logits = model(xb)
            preds = torch.argmax(logits, dim=1).cpu().tolist()
            all_preds.extend(preds)
            all_true.extend(yb.tolist())

    # Accuracy
    correct = sum(p == t for p, t in zip(all_preds, all_true))
    accuracy = correct / max(len(all_true), 1)

    # Confusion matrix (NxN)
    conf_matrix = [[0] * n_classes for _ in range(n_classes)]
    for true_i, pred_i in zip(all_true, all_preds):
        if 0 <= true_i < n_classes and 0 <= pred_i < n_classes:
            conf_matrix[true_i][pred_i] += 1

    # Classification report por clase
    clf_report: Dict = {}
    for cls_idx in range(n_classes):
        tp = conf_matrix[cls_idx][cls_idx]
        fp = sum(conf_matrix[r][cls_idx] for r in range(n_classes) if r != cls_idx)
        fn = sum(conf_matrix[cls_idx][c] for c in range(n_classes) if c != cls_idx)
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall / (precision + recall)
              if (precision + recall) > 0 else 0.0)
        support = sum(conf_matrix[cls_idx])
        clf_report[class_names[cls_idx]] = {
            'precision': round(precision, 4),
            'recall': round(recall, 4),
            'f1_score': round(f1, 4),
            'support': support,
        }

    return accuracy, conf_matrix, clf_report


def serialize_model(model: Any) -> bytes:
    """Serializa el modelo PyTorch a bytes con torch.save."""
    import torch
    import io
    buf = io.BytesIO()
    torch.save(model.state_dict(), buf)
    return buf.getvalue()
