"""
Workspace URLs
"""

from django.urls import path
from . import views

urlpatterns = [
    path('workspace/', views.workspace_list, name='workspace-list'),
    path('workspace/<uuid:workspace_id>/', views.workspace_detail, name='workspace-detail'),
    path('workspace/<uuid:workspace_id>/upload/', views.workspace_upload, name='workspace-upload'),
    path('workspace/<uuid:workspace_id>/run/', views.workspace_run, name='workspace-run'),
]
