
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views import visual_learning_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("api/visual-learning/", visual_learning_view),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
