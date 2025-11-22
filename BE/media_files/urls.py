from django.urls import path
from .views import MediaFileDownloadView

app_name = 'media_files'

urlpatterns = [
    path('<int:file_id>/download/', MediaFileDownloadView.as_view(), name='download'),
]