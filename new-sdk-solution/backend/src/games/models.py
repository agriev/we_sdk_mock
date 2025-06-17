from django.db import models

class Game(models.Model):
    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    launch_url = models.CharField(max_length=255)
    thumbnail = models.ImageField(upload_to='games/thumbnails/', blank=True)
    opens = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    CATEGORY_CHOICES = [
        ('action', 'Action'),
        ('puzzle', 'Puzzle'),
        ('casual', 'Casual'),
        ('strategy', 'Strategy'),
    ]
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='casual')

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title 