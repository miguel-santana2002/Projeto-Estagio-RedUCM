from django.db import migrations


def forwards(apps, schema_editor):
    RuleModel = apps.get_model('rules', 'RuleModel')
    Rule = apps.get_model('rules', 'Rule')
    for model in RuleModel.objects.all():
        general = Rule.objects.create(
            title=model.title, useCaseId=model.useCaseId, type=model.type,
            syntax=model.syntax, ruleCode=model.ruleCode,
            logsources=model.logsources, client=None,
            status='Regra não validada', ruleModel=model,
        )
        Rule.objects.filter(ruleModel=model).exclude(pk=general.pk).update(
            parent=general, title=model.title,
            useCaseId=model.useCaseId, type=model.type,
        )


class Migration(migrations.Migration):
    dependencies = [('rules', '0021_rule_unify_fields')]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]