import random
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db import models
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.auth.models import BaseUserManager
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
import pyotp


class Company (models.Model):
    name = models.CharField(max_length=30, unique=True)  
    siem = models.CharField(max_length=50, blank=True, null=True)  # <-- ADICIONei ESTA LINHA
    logsources = ArrayField(models.CharField( blank=True, null=True),blank=True, null=True)  
    date = models.DateTimeField(auto_now_add=True, null=True)
    def __str__(self):
        return self.name
    

class MyAccountManager(BaseUserManager):
    def create_user(self, email, username, password=None,  companies =None, otpMethod='email'):
        if not email:
            raise ValueError("Users must have an email address")
        if not username:
            raise ValueError("Users must have a username")


        user = self.model(
            email=self.normalize_email(email),
            username=username,
            companies = companies ,    
            otpMethod=otpMethod       
        )

        user.set_password(password)
        user.save(using=self._db)
        return user



    def create_superuser(self, email, password, username ='Administrator', companies = [], otpMethod='totp'):
        user = self.create_user(
            email=self.normalize_email(email),
            password=password,
            username=username,
            companies = companies,
            otpMethod=otpMethod
        )
        user.is_admin = True
        user.is_staff = True
        
        user.is_superuser = True
        user.save(using=self._db)
        return user
    


class User(AbstractBaseUser):
    email = models.EmailField(verbose_name="email", max_length=60, unique=True)
    username = models.CharField(max_length=30, unique=False, default="")
    date_joined = models.DateTimeField(verbose_name="date joined", auto_now_add=True)
    last_login = models.DateTimeField(verbose_name="last login", auto_now=True)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    companies = ArrayField(models.CharField(blank=True, null=True), blank=True, null=True)
    otp = models.CharField(max_length=6, default="000000")
    otp_time = models.DateTimeField(auto_now_add=True, null=True)
    totp_secret = models.CharField(max_length=32, default=pyotp.random_base32, blank=True)
    otpMethod = models.CharField(max_length=10, choices=[('email', 'Email'), ('totp', 'TOTP')], default='email')
    showTotp = models.BooleanField(default=True)


    USERNAME_FIELD = "email"
    
    objects = MyAccountManager()

    def generate_otp(self):
        self.otp = f'{random.randint(100000, 999999):06}'
        self.otp_time = timezone.now()
        self.save()

    def generate_totp_uri(self):
        totp = pyotp.TOTP(self.totp_secret)
        return totp.provisioning_uri(self.email, issuer_name="RedUCM")

    def verify_totp(self, token):
        totp = pyotp.TOTP(self.totp_secret)
        return totp.verify(token)


    def __str__(self):
        return self.email

    def has_perm(self, perm, obj=None):
        return self.is_admin

    def has_module_perms(self, app_label):
        return True
    
