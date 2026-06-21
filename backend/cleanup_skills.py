from django.db.models import Count
from django.db.models.functions import Lower
from apps.jobs.models import Skill, JobSkill
from apps.applications.models import ApplicationSkill

dupes = Skill.objects.annotate(lower_name=Lower('skill_name')).values('lower_name').annotate(c=Count('id')).filter(c__gt=1)

for d in dupes:
    rows = list(Skill.objects.filter(skill_name__iexact=d['lower_name']).order_by('id'))
    canonical = rows[0]
    losers = rows[1:]

    for loser in losers:
        for js in JobSkill.objects.filter(skill=loser):
            if JobSkill.objects.filter(job=js.job, skill=canonical).exists():
                js.delete()
            else:
                js.skill = canonical
                js.save()

        for aps in ApplicationSkill.objects.filter(skill=loser):
            if ApplicationSkill.objects.filter(application=aps.application, skill=canonical).exists():
                aps.delete()
            else:
                aps.skill = canonical
                aps.save()

        print(f"Merging '{loser.skill_name}' (id={loser.id}) into '{canonical.skill_name}' (id={canonical.id})")
        loser.delete()

print("Done.")