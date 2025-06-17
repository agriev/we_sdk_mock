import os
from typing import NamedTuple

Network = NamedTuple(
    'Network',
    [
        ('name', str), ('slug', str), ('proto_path', str), ('model_path', str), ('image_params', tuple),
        ('dimension', int), ('space', str)
    ]
)

NETWORKS = [
    Network(
        name='Squeezenet',
        slug='squeezenet',
        proto_path='/app/config/models/squeezenet/deploy.prototxt',
        model_path=os.environ.get(
            'SQUEEZENET_MODEL',
            '/app/config/models/squeezenet/squeezenet_v1.1.caffemodel'
        ),
        image_params=(1, (227, 227), (104, 117, 123), True, False),
        dimension=1000,
        space='cosine',
    ),
    Network(
        name='Googlenet Places',
        slug='googlenet_places',
        proto_path='/app/config/models/googlenet_places/deploy.prototxt',
        model_path=os.environ.get(
            'GOOGLENET_PLACES_MODEL',
            '/app/config/models/googlenet_places/googlelet_places_205_train_iter_2400000.caffemodel'
        ),
        image_params=(1, (224, 224), (0, 0, 0), False, False),
        dimension=205,
        space='cosine',
    ),
]

NETWORKS_SELECTS = ((net.slug, net.name) for net in NETWORKS)

SLUG_MAX_LEN = max(len(net.slug) for net in NETWORKS)
