"""
Factory Boy factories for test fixtures.

Provides reusable factories for creating model instances in tests,
replacing manual object creation with consistent, configurable factories.
"""

import factory
from django.contrib.auth import get_user_model

from apps.documents.models import Document
from apps.datasets.models import Dataset, DatasetFile
from apps.topic_modeling.models import TopicModeling

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    """Factory for the custom User model."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    username = factory.Sequence(lambda n: f'user_{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')
    name = factory.Faker('first_name', locale='es_CO')
    surname = factory.Faker('last_name', locale='es_CO')
    role = 'user'
    is_active = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        password = extracted or 'testpass123'
        self.set_password(password)
        if create:
            self.save()

    class Params:
        admin = factory.Trait(
            role='admin',
            is_staff=True,
        )


class DocumentFactory(factory.django.DjangoModelFactory):
    """Factory for the Document model."""

    class Meta:
        model = Document

    drive_file_id = factory.Sequence(lambda n: f'drive_file_{n}')
    filename = factory.Sequence(lambda n: f'document_{n}.pdf')
    status = 'pending'
    txt_content = factory.Faker('text', max_nb_chars=500)


class DatasetFactory(factory.django.DjangoModelFactory):
    """Factory for the Dataset model."""

    class Meta:
        model = Dataset

    name = factory.Sequence(lambda n: f'Dataset {n}')
    description = factory.Faker('sentence')
    source = 'upload'
    status = 'completed'
    total_files = 5
    total_size_bytes = 1024000
    created_by = factory.SubFactory(UserFactory)


class DatasetFileFactory(factory.django.DjangoModelFactory):
    """Factory for the DatasetFile model."""

    class Meta:
        model = DatasetFile

    dataset = factory.SubFactory(DatasetFactory)
    filename = factory.Sequence(lambda n: f'file_{n}.txt')
    original_filename = factory.LazyAttribute(lambda obj: obj.filename)
    file_path = factory.LazyAttribute(lambda obj: f'/media/datasets/{obj.filename}')
    file_size_bytes = 2048
    mime_type = 'text/plain'
    status = 'completed'
    txt_content = factory.Faker('text', max_nb_chars=300)


class TopicModelingFactory(factory.django.DjangoModelFactory):
    """Factory for the TopicModeling model."""

    class Meta:
        model = TopicModeling

    name = factory.Sequence(lambda n: f'Topic Analysis {n}')
    description = factory.Faker('sentence')
    created_by = factory.SubFactory(UserFactory)
    source_type = 'dataset'
    dataset = factory.SubFactory(DatasetFactory)
    algorithm = 'lda'
    num_topics = 10
    num_words = 10
    status = 'pending'
