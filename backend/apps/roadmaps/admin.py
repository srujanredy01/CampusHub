from django.contrib import admin
from .models import Roadmap, RoadmapMilestone, RoadmapStep, StudentRoadmapProgress

admin.site.register(Roadmap)
admin.site.register(RoadmapMilestone)
admin.site.register(RoadmapStep)
admin.site.register(StudentRoadmapProgress)
