"""
Add assignment, contest, roadmap content types and metadata field to SavedItem.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("saved", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="saveditem",
            name="content_type",
            field=models.CharField(
                choices=[
                    ("coding_problem", "Coding Problem"),
                    ("news_article", "News Article"),
                    ("resource", "Resource"),
                    ("assignment", "Assignment"),
                    ("contest", "Contest"),
                    ("roadmap", "Roadmap"),
                ],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="saveditem",
            name="metadata",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Cached content metadata for fast display",
            ),
        ),
    ]
