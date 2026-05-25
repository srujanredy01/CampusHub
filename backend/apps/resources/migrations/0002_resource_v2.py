"""
Migration v2: Rebuild resources table with academic_year, new file_type choices,
tags, preview_supported, file_mime_type fields.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("resources", "0001_initial"),
    ]

    operations = [
        # Remove old indexes FIRST (before dropping columns they reference)
        migrations.RemoveIndex(model_name="resource", name="resources_branch_sem_subj_idx"),
        migrations.RemoveIndex(model_name="resource", name="resources_type_idx"),

        # Drop old resource_type column (replaced by file_type with new choices)
        migrations.RemoveField(model_name="resource", name="resource_type"),

        # Rename old file_type (was mime type string) to file_mime_type
        migrations.RenameField(
            model_name="resource",
            old_name="file_type",
            new_name="file_mime_type",
        ),

        # Add new file_type with proper choices
        migrations.AddField(
            model_name="resource",
            name="file_type",
            field=models.CharField(
                choices=[
                    ("pdf", "PDF"),
                    ("presentation", "Presentation"),
                    ("document", "Document"),
                    ("spreadsheet", "Spreadsheet"),
                    ("other", "Other"),
                ],
                default="pdf",
                max_length=20,
            ),
        ),

        # Add academic_year
        migrations.AddField(
            model_name="resource",
            name="academic_year",
            field=models.PositiveSmallIntegerField(
                choices=[(1, "1st Year"), (2, "2nd Year"), (3, "3rd Year"), (4, "4th Year")],
                default=1,
            ),
        ),

        # Add tags
        migrations.AddField(
            model_name="resource",
            name="tags",
            field=models.CharField(blank=True, default="", max_length=500),
        ),

        # Add preview_supported
        migrations.AddField(
            model_name="resource",
            name="preview_supported",
            field=models.BooleanField(default=False),
        ),

        # Add new indexes
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["academic_year", "semester"], name="res_year_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["branch", "semester"], name="res_branch_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["file_type"], name="res_file_type_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(
                fields=["is_active", "-created_at"], name="res_active_created_idx"
            ),
        ),
    ]
