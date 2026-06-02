
from . import views
from django.conf import settings
from django.conf.urls.static import static
from django.urls import path
from api.views import visual_learning_view

urlpatterns = [
    path('ping/',          views.ping,         name='ping'),
    path('chat/',          views.chat,         name='chat'),
    path('quiz/',          views.quiz,         name='quiz'),
    path('study-plan/',    views.study_plan,   name='study_plan'),
    path('motivation-questions/', views.motivation_questions_view),
    path('progressive-quiz/', views.progressive_quiz_view),
    path('psycho-profile/', views.psycho_profile_view),
    path('visual-learning/', views.visual_learning_view,name='visual_learning'),
    path('orientation/generate-questions/', views.orientation_generate_questions_view, name='orientation_generate_questions'),
    path("orientation/", views.orientation_view, name='orientation'),
    path("orientation/suggestion/",views.orientation_suggestion_view),
    path("orientation/tags/",views.orientation_tags_view),
]   
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)