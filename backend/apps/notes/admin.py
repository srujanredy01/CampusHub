from django.contrib import admin
from .models import Note, NoteVote, NoteBookmark, NoteRating

@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display  = ["title", "subject", "branch", "semester", "status", "uploaded_by", "download_count", "upvotes", "average_rating", "created_at"]
    list_filter   = ["status", "branch", "semester", "file_type"]
    search_fields = ["title", "subject", "tags", "uploaded_by__full_name"]
    readonly_fields = ["id", "download_count", "view_count", "upvotes", "downvotes", "average_rating", "rating_count", "created_at", "updated_at", "moderated_at"]
    list_editable = ["status"]

@admin.register(NoteVote)
class NoteVoteAdmin(admin.ModelAdmin):
    list_display = ["note", "user", "vote", "created_at"]

@admin.register(NoteBookmark)
class NoteBookmarkAdmin(admin.ModelAdmin):
    list_display = ["note", "user", "created_at"]


@admin.register(NoteRating)
class NoteRatingAdmin(admin.ModelAdmin):
    list_display = ["note", "user", "rating", "created_at", "updated_at"]
