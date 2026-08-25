import os

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import Company, User


class Command(BaseCommand):
    help = (
        "Seeds a demo admin account and a demo company for a fresh, empty "
        "database. Safe to run repeatedly: does nothing if any user already "
        "exists."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        if User.objects.exists():
            self.stdout.write("Users already exist, skipping demo seed.")
            return

        admin_email = os.getenv("DEMO_ADMIN_EMAIL", "admin@example.com")
        admin_password = os.getenv("DEMO_ADMIN_PASSWORD", "ChangeMe123!")

        company, _ = Company.objects.get_or_create(
            name="Demo Company",
            defaults={"logsources": ["windows", "linux"]},
        )

        User.objects.create_superuser(
            email=admin_email,
            password=admin_password,
            username="Administrator",
            companies=[company.name],
            otpMethod="totp",
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Created demo admin '{admin_email}' (password from "
                f"DEMO_ADMIN_PASSWORD) and demo company '{company.name}'."
            )
        )
