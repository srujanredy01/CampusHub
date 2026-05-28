"""
Seed default auto-moderation rules and escalation config.
Usage: python manage.py seed_moderation_rules
"""
from django.core.management.base import BaseCommand
from apps.moderation.models import AutoModerationRule, EscalationConfig


class Command(BaseCommand):
    help = "Seed default auto-moderation rules and escalation config"

    def handle(self, *args, **options):
        rules_created = 0

        default_rules = [
            {
                "name": "Profanity Filter",
                "rule_type": "keyword",
                "pattern": "fuck,shit,bitch,asshole,bastard,damn,crap",
                "action": "warn",
                "severity": "mild",
            },
            {
                "name": "Hate Speech Detection",
                "rule_type": "keyword",
                "pattern": "kill yourself,kys,go die,neck yourself",
                "action": "block",
                "severity": "severe",
            },
            {
                "name": "Threat Detection",
                "rule_type": "regex",
                "pattern": r"(i will|gonna|going to)\s+(kill|hurt|beat|attack)",
                "action": "block",
                "severity": "severe",
            },
            {
                "name": "Spam Link Filter",
                "rule_type": "link_filter",
                "pattern": "bit.ly,tinyurl.com,t.co,goo.gl",
                "action": "flag",
                "severity": "mild",
            },
            {
                "name": "Caps Spam Filter",
                "rule_type": "caps_filter",
                "pattern": "0.7",
                "action": "warn",
                "severity": "mild",
            },
            {
                "name": "Mass Mention Spam",
                "rule_type": "mention_limit",
                "pattern": "5",
                "action": "delete",
                "severity": "moderate",
            },
        ]

        for rule_data in default_rules:
            _, created = AutoModerationRule.objects.get_or_create(
                name=rule_data["name"],
                defaults=rule_data,
            )
            if created:
                rules_created += 1

        # Seed escalation config
        _, config_created = EscalationConfig.objects.get_or_create(
            name="default",
            defaults={
                "warnings_before_mute": 3,
                "mute_duration_minutes": 60,
                "mutes_before_suspend": 3,
                "suspend_duration_hours": 24,
                "suspensions_before_ban": 3,
                "violation_window_hours": 168,
            },
        )

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {rules_created} auto-moderation rules. "
            f"Escalation config: {'created' if config_created else 'already exists'}."
        ))
