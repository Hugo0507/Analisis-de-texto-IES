"""
Workspace URLs
"""

from django.urls import path
from . import views

urlpatterns = [
    path('workspace/', views.workspace_list, name='workspace-list'),
    path('workspace/import/', views.workspace_import_config, name='workspace-import-config'),
    path('workspace/corpus-stopwords/', views.workspace_corpus_stopwords, name='workspace-corpus-stopwords'),
    path('workspace/<uuid:workspace_id>/', views.workspace_detail, name='workspace-detail'),
    path('workspace/<uuid:workspace_id>/upload/', views.workspace_upload, name='workspace-upload'),
    path('workspace/<uuid:workspace_id>/run/', views.workspace_run, name='workspace-run'),
    # Stopwords
    path('workspace/<uuid:workspace_id>/stopwords/', views.workspace_stopwords, name='workspace-stopwords'),
    path('workspace/<uuid:workspace_id>/stopwords/update/', views.workspace_stopwords_update, name='workspace-stopwords-update'),
    path('workspace/<uuid:workspace_id>/stopwords/import/', views.workspace_stopwords_import, name='workspace-stopwords-import'),
    # Export
    path('workspace/<uuid:workspace_id>/export/excel/', views.workspace_export_excel, name='workspace-export-excel'),
    path('workspace/<uuid:workspace_id>/export/config/', views.workspace_export_config, name='workspace-export-config'),
]
