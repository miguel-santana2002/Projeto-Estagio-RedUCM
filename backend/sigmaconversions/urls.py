from django.urls import path
from sigmaconversions.views import convertSigma, convertSigmaToSplunk
from rest_framework.urlpatterns import format_suffix_patterns


urlpatterns = [
    path('convertSigmaToSplunk', convertSigmaToSplunk, name='convertSigmaToSplunk'),
    path('convertSigma', convertSigma, name='convertSigma')

]

# urlpatterns = format_suffix_patterns(urlpatterns)
