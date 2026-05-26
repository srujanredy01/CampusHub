from django.contrib import admin
from .models import Assignment, AssignmentSubmission, AssignmentComment

admin.site.register(Assignment)
admin.site.register(AssignmentSubmission)
admin.site.register(AssignmentComment)
