import { createRouter, createWebHistory } from 'vue-router';

import Home from '../pages/Home.vue';
import Game from '../pages/Game.vue';
import Profile from '../pages/Profile.vue';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/game/:slug', name: 'game', component: Game },
  { path: '/profile', name: 'profile', component: Profile },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router; 