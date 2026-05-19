from django.urls import path
from . import views

urlpatterns = [
    path('ping/',          views.ping,         name='ping'),
    path('chat/',          views.chat,         name='chat'),
    path('quiz/',          views.quiz,         name='quiz'),
    path('study-plan/',    views.study_plan,   name='study_plan'),
    path('analyze-image/', views.analyze_image,name='analyze_image'),
    path('orientation/generate-questions/', views.orientation_generate_questions_view, name='orientation_generate_questions'),
    path("orientation/", views.orientation_view, name='orientation'),
]   