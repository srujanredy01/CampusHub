from django.contrib import admin
from .models import StudentXP, XPTransaction, Badge, StudentBadge

admin.site.register(StudentXP)
admin.site.register(XPTransaction)
admin.site.register(Badge)
admin.site.register(StudentBadge)
