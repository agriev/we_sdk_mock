import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase, TransactionTestCase
from rest_framework.authtoken.models import Token

from apps.games.models import Game


class DiscussionsBaseTestCase(object):
    # noinspection PyPep8Naming
    def setUp(self):
        self.user = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')[0]
        self.user_1 = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')[0]

        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key

        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = Client(**kwargs)

        self.game = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        self.game_1 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0]

        super().setUp()

    def create(self):
        return self.client_auth.post('/api/discussions', {
            'game': self.game.id,
            'title': 'my question!',
            'text': 'awesome!\nplay right now!',
        }).json()['id']


class DiscussionTransactionTestCase(DiscussionsBaseTestCase, TransactionTestCase):
    def test_post(self):
        last_mod_before = Game.objects.get(pk=self.game.pk).updated
        data = {
            'game': self.game.id,
            'title': 'my question!',
            'text': 'awesome!\nplay right now!',
        }
        self.assertEqual(self.client_auth.post('/api/discussions', data).status_code, 201)
        self.assertNotEqual(last_mod_before, self.game.updated)


class DiscussionTestCase(DiscussionsBaseTestCase, TestCase):
    def test_post(self):
        data = {
            'game': self.game.id,
            'title': 'my question!',
            'text': 'awesome!\nplay right now!',
        }
        self.assertEqual(self.client_auth.post('/api/discussions', data).status_code, 201)
        self.assertEqual(self.client.post('/api/discussions', data).status_code, 401)

    def test_post_safe(self):
        replaces = [
            ('<h1>hi</h1>', 'hi'),
            ('<b>hello</b>', 'hello'),
            ('<a href="https://google.com/">Google</a>', 'Google'),
            ('<br />', '<br/>'),
            ('\n', '\n'),
            ('<img src="https://google.com/image.jpg">',
             ''),
            ('<div class="editor__loader"><div class="editor__insertion">'
             '<img src="https://devmedia.ag.ru/image.jpg"></div></div>',
             '<div class="editor__loader"><div class="editor__insertion">'
             '<img src="https://devmedia.ag.ru/image.jpg"/></div></div>'),
            ('<img src="https://devmedia.ag.ru/image.jpg" onclick="alert();" id="ok" class="editor__iframe">',
             '<img class="editor__iframe" id="ok" src="https://devmedia.ag.ru/image.jpg"/>'),
            ('<div class="editor__loader-icon"><img src="https://devmedia.ag.ru/image.jpg"></div>',
             '<div class="editor__loader-icon"><img src="https://devmedia.ag.ru/image.jpg"/></div>'),
            ('<iframe width="560" height="315" src="https://www.youtube.com/embed/Obu1hVsc8IE" '
             'frameborder="0" allowfullscreen></iframe>',
             '<iframe allowfullscreen height="315" '
             'src="https://www.youtube.com/embed/Obu1hVsc8IE" width="560"></iframe>'),
            ('<iframe src="about:blank"></iframe>',
             ''),
            ('<embed sandbox="allow-forms allow-scripts" src="https://coub.com/mouse.swf" width="400" height="300" '
             'type="application/x-shockwave-flash"></embed>',
             '<embed height="300" sandbox="allow-forms allow-scripts" src="https://coub.com/mouse.swf" '
             'type="application/x-shockwave-flash" width="400"/>'),
            ('<div class="test1"><div class="test2">'
             '<iframe width="560" height="315" src="https://www.youtube.com/embed/Obu1hVsc8IE" '
             'frameborder="0" allowfullscreen></iframe>'
             '</div></div>',
             '<div><div>'
             '<iframe allowfullscreen height="315" src="https://www.youtube.com/embed/Obu1hVsc8IE" width="560">'
             '</iframe>'
             '</div></div>'),
            ('https://google.com/',
             '<a href="https://google.com/" rel="nofollow">https://google.com/</a>'),
        ]
        previews = [
            '<div class="editor__loader"><div class="editor__insertion"><img src="https://devmedia.ag.ru/image.jpg">'
            '</div></div>',
            '<div><div>'
            '<iframe allowfullscreen height="315" src="https://www.youtube.com/embed/Obu1hVsc8IE" width="560">'
            '</iframe>'
            '</div></div>',
        ]
        data = {
            'game': self.game.id,
            'title': 'my question!',
            'text': ''.join([r[0] for r in replaces]),
        }
        answer = self.client_auth.post('/api/discussions', data).json()
        text = ''.join([r[1] for r in replaces])
        self.assertEqual(answer['text'], text)
        self.assertEqual(answer['text_preview'], previews[0])
        self.assertEqual(answer['text_previews'], previews)
        self.assertEqual(answer['text_attachments'], 6)

    def test_post_preview_tail(self):
        text = 'test<br><div class="editor__insertion"><div>' \
               '<img src="https://devmedia.ag.ru/media/user_images/976/976ce0d001bf7b8b5cbf64544b87f854.jpg">' \
               '</div></div>test<br><br>'
        result = '<div class="editor__insertion"><div>' \
                 '<img src="https://devmedia.ag.ru/media/user_images/976/976ce0d001bf7b8b5cbf64544b87f854.jpg">' \
                 '</div></div>'
        data = {
            'game': self.game.id,
            'title': 'my question!',
            'text': text,
        }
        answer = self.client_auth.post('/api/discussions', data).json()['text_preview']
        self.assertEqual(answer, result)

    def test_post_preview_only_img(self):
        data = {
            'game': self.game.id,
            'title': 'my question!',
            'text': '<img src="https://devmedia.ag.ru/images.jpg">'
        }
        self.assertEqual(self.client_auth.post('/api/discussions', data).json()['text'],
                         '<img src="https://devmedia.ag.ru/images.jpg"/>')

    def test_post_preview_only_br(self):
        response = self.client_auth.post('/api/discussions', {
            'game': self.game.id,
            'title': 'my question!',
            'text': ' <br> '
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.json().keys())

    def test_post_required(self):
        post = self.client_auth.post('/api/discussions')
        self.assertEqual(post.status_code, 400)
        data = post.json()
        self.assertEqual(len(data), 2)
        self.assertIn('game', data.keys())
        self.assertIn('text', data.keys())

    def test_patch(self):
        pk = self.create()

        kwargs = {'data': json.dumps({'text': 'cool'}), 'content_type': 'application/json'}
        patch = self.client_auth.patch('/api/discussions/{}'.format(pk), **kwargs)
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['text'], 'cool')

        patch = self.client_auth_1.patch('/api/discussions/{}'.format(pk), **kwargs)
        self.assertEqual(patch.status_code, 403)

    def test_patch_game(self):
        pk = self.create()
        patch = self.client_auth.patch('/api/discussions/{}'.format(pk), json.dumps({'game': self.game_1.id}),
                                       content_type='application/json')
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['game']['id'], self.game.id)

    def test_delete(self):
        pk = self.create()
        self.assertEqual(self.client_auth_1.get('/api/discussions/{}'.format(pk)).json()['can_delete'], False)
        self.assertEqual(self.client_auth_1.delete('/api/discussions/{}'.format(pk)).status_code, 403)
        self.assertEqual(self.client_auth.get('/api/discussions/{}'.format(pk)).json()['can_delete'], True)
        self.assertEqual(self.client_auth.delete('/api/discussions/{}'.format(pk)).status_code, 204)

    def test_delete_and_create(self):
        pk = self.create()
        self.assertEqual(self.client_auth.delete('/api/discussions/{}'.format(pk)).status_code, 204)
        self.assertIsNot(self.create(), pk)

    def test_get(self):
        pk = self.create()
        get = self.client.get('/api/discussions/{}'.format(pk))
        self.assertEqual(get.status_code, 200)


class CommentTestCase(DiscussionsBaseTestCase, TestCase):
    def test_post(self):
        discussion_id = self.create()
        action = '/api/discussions/{}/comments'.format(discussion_id)

        data = {'text': 'cool!\nhttps://google.com/\nhttp://yandex.ru'}
        html = 'cool!<br>' \
               '<a href="https://google.com/" rel="nofollow">https://google.com/</a><br>' \
               '<a href="http://yandex.ru" rel="nofollow">http://yandex.ru</a>'
        post = self.client_auth.post(action, data)
        parent_id = post.json()['id']
        self.assertEqual(post.status_code, 201)
        self.assertEqual(post.json()['text'], html)

        data['parent'] = parent_id
        post = self.client_auth.post(action, data)
        self.assertEqual(post.status_code, 201)

        data['parent'] = post.json()['id']
        self.assertEqual(self.client_auth.post(action, data).json()['parent'], parent_id)

        self.assertEqual(self.client.post(action, data).status_code, 401)

    def test_post_bad_parent(self):
        discussion_1 = self.create()
        discussion_2 = self.create()

        parent_1 = self.client_auth.post(
            '/api/discussions/{}/comments'.format(discussion_1),
            {'text': 'text 1'}
        ).json()['id']

        parent_2 = self.client_auth.post(
            '/api/discussions/{}/comments'.format(discussion_2),
            {'text': 'text 2'}
        ).json()['id']

        response = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_2), {
            'text': 'answer',
            'parent': parent_1
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('parent', response.json())

        response = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_2), {
            'text': 'answer',
            'parent': parent_2
        })
        self.assertEqual(response.status_code, 201)

    def test_post_empty(self):
        discussion_id = self.create()
        action = '/api/discussions/{}/comments'.format(discussion_id)

        response = self.client_auth.post(action, {'text': ''})
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.json())

        response = self.client_auth.post(action, json.dumps({'text': None}), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('text', response.json())

    def test_patch(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}'.format(discussion_id, pk)
        kwargs = {'data': json.dumps({'text': 'cool?'}), 'content_type': 'application/json'}

        patch = self.client_auth.patch(action, **kwargs)
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['text'], 'cool?')

        patch = self.client_auth_1.patch(action, **kwargs)
        self.assertEqual(patch.status_code, 403)

    def test_patch_parent(self):
        discussion_id = self.create()
        action = '/api/discussions/{}/comments'.format(discussion_id)
        pk1 = self.client_auth.post(action, {'text': 'cool!'}).json()['id']
        pk2 = self.client_auth.post(action, {'text': 'coolest'}).json()['id']
        pk3 = self.client_auth.post(action, {'text': 'cool?', 'parent': pk1}).json()['id']

        action = '/api/discussions/{}/comments/{}'.format(discussion_id, pk3)
        patch = self.client_auth.patch(action, json.dumps({'parent': pk2}), content_type='application/json')
        self.assertEqual(patch.status_code, 200)
        self.assertEqual(patch.json()['parent'], pk1)

    def test_delete(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}'.format(discussion_id, pk)

        self.assertEqual(self.client_auth_1.get(action).json()['can_delete'], False)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.get(action).json()['can_delete'], True)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)


class CommentTransactionTestCase(DiscussionsBaseTestCase, TransactionTestCase):
    def test_post_not_found(self):
        self.assertEqual(self.client_auth.post('/api/discussions/123456/comments', {'text': 'cool!'}).status_code, 400)

    def test_counters(self):
        discussion_id = self.create()
        post = '/api/discussions/{}/comments'.format(discussion_id)
        action = '/api/discussions/{}'.format(discussion_id)

        data = {'text': 'cool!'}
        id1 = self.client_auth.post(post, data).json()['id']
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 1)
        self.assertEqual(response_data['comments_parent_count'], 1)

        data = {'text': 'coolest'}
        id2 = self.client_auth.post(post, data).json()['id']
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 2)
        self.assertEqual(response_data['comments_parent_count'], 2)

        data = {'text': 'cool?', 'parent': id1}
        self.client_auth_1.post(post, data)
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 3)
        self.assertEqual(response_data['comments_parent_count'], 2)
        self.assertEqual(self.client.get(post).json()['results'][0]['comments_count'], 1)

        self.client_auth.delete('{}/{}'.format(post, id1))
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 1)
        self.assertEqual(response_data['comments_parent_count'], 1)

        self.client_auth.delete('{}/{}'.format(post, id2))
        response_data = self.client.get(action).json()
        self.assertEqual(response_data['comments_count'], 0)
        self.assertEqual(response_data['comments_parent_count'], 0)

    def test_attached(self):
        discussion_id = self.create()
        post = '/api/discussions/{}/comments'.format(discussion_id)
        action = '/api/games/{}/discussions'.format(self.game.id)

        data = {'text': 'cool!'}
        id1 = self.client_auth.post(post, data).json()['id']
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        data = {'text': 'coolest'}
        id2 = self.client_auth.post(post, data).json()['id']
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        data = {'text': 'cool?', 'parent': id1}
        self.client_auth_1.post(post, data)
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        self.client_auth.post('/api/discussions/{}/comments/{}/likes'.format(discussion_id, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        self.client_auth.delete('/api/discussions/{}/comments/{}/likes/{}'.format(discussion_id, id1, self.user.pk))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 2)
        self.assertEqual(comments['results'][0]['id'], id1)
        self.assertEqual(comments['results'][1]['id'], id2)

        self.client_auth.post('/api/discussions/{}/comments/{}/likes'.format(discussion_id, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id1)

        self.client_auth.delete('{}/{}'.format(post, id1))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 1)
        self.assertEqual(comments['results'][0]['id'], id2)

        self.client_auth.delete('{}/{}'.format(post, id2))
        comments = self.client.get(action).json()['results'][0]['comments']
        self.assertEqual(comments['count'], 0)


class CommentLikeTestCase(DiscussionsBaseTestCase, TestCase):
    def test_post(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}/likes'.format(discussion_id, pk)

        self.assertEqual(self.client_auth.post(action).status_code, 201)
        self.assertEqual(self.client.post(action).status_code, 401)

    def test_delete(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}/likes/{}'.format(discussion_id, pk, self.user.id)

        self.client_auth.post('/api/discussions/{}/comments/{}/likes'.format(discussion_id, pk))
        self.assertEqual(self.client.delete(action).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action).status_code, 403)
        self.assertEqual(self.client_auth.delete(action).status_code, 204)

    def test_user_like(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}/likes'.format(discussion_id, pk)
        discussion = '/api/discussions/{}/comments/{}'.format(discussion_id, pk)
        discussions = '/api/discussions/{}/comments'.format(discussion_id)

        self.client_auth_1.post(action)

        self.assertEqual(self.client_auth_1.get(discussion).json()['user_like'], True)
        self.assertEqual(self.client_auth.get(discussion).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(discussions).json()['results'][0]['user_like'], True)
        self.assertEqual(self.client_auth.get(discussions).json()['results'][0]['user_like'], False)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        self.assertEqual(self.client_auth_1.get(discussion).json()['user_like'], False)
        self.assertEqual(self.client_auth.get(discussion).json()['user_like'], False)
        self.assertEqual(self.client_auth_1.get(discussions).json()['results'][0]['user_like'], False)
        self.assertEqual(self.client_auth.get(discussions).json()['results'][0]['user_like'], False)


class CommentLikeTransactionTestCase(DiscussionsBaseTestCase, TransactionTestCase):
    def test_likes_count(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']
        action = '/api/discussions/{}/comments/{}/likes'.format(discussion_id, pk)
        discussion_action = '/api/discussions/{}/comments/{}'.format(discussion_id, pk)
        discussions_action = '/api/discussions/{}/comments'.format(discussion_id)

        self.client_auth.post(action)

        discussion = self.client_auth.get(discussion_action).json()
        discussions = self.client_auth_1.get(discussions_action).json()
        self.assertEqual(discussion['likes_count'], 1)
        self.assertEqual(discussions['results'][0]['likes_count'], 1)

        self.client_auth_1.post(action)

        discussion = self.client_auth.get(discussion_action).json()
        discussions = self.client_auth_1.get(discussions_action).json()
        self.assertEqual(discussion['likes_count'], 2)
        self.assertEqual(discussions['results'][0]['likes_count'], 2)

        self.client_auth_1.delete('{}/{}'.format(action, self.user_1.id))

        discussion = self.client_auth.get(discussion_action).json()
        discussions = self.client_auth_1.get(discussions_action).json()
        self.assertEqual(discussion['likes_count'], 1)
        self.assertEqual(discussions['results'][0]['likes_count'], 1)

    def test_like_in_feed(self):
        discussion_id = self.create()
        pk = self.client_auth.post('/api/discussions/{}/comments'.format(discussion_id), {'text': 'cool!'}) \
            .json()['id']

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        self.assertFalse(self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()
                         ['results'][1]['discussions']['results'][0]['comments']['results'][0]['user_like'])

        self.client_auth_1.post('/api/discussions/{}/comments/{}/likes'.format(discussion_id, pk))

        self.assertTrue(self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()
                        ['results'][1]['discussions']['results'][0]['comments']['results'][0]['user_like'])
