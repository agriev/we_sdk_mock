<template>
  <div class="w-64 bg-bg-block h-screen p-4 overflow-y-auto">
    <!-- Main Navigation -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-gray-400">Главное</h2>
      <div class="space-y-1">
        <router-link
          :to="{ name: 'home' }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': !$route.query.category }"
        >
          <i class="fas fa-home mr-3 text-gray-400"></i>
          <span>Все игры</span>
        </router-link>
        <router-link
          :to="{ name: 'home', query: { popular: 'true' } }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': $route.query.popular }"
        >
          <i class="fas fa-fire mr-3 text-gray-400"></i>
          <span>Популярные</span>
        </router-link>
      </div>
    </div>

    <!-- Categories -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-gray-400">Категории</h2>
      <div class="space-y-1">
        <router-link
          v-for="category in categories"
          :key="category"
          :to="{ name: 'home', query: { category } }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': isActive(category) }"
        >
          <i :class="getCategoryIcon(category)" class="mr-3 text-gray-400"></i>
          <span>{{ category }}</span>
        </router-link>
      </div>
    </div>

    <!-- Collections -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold mb-4 text-gray-400">Подборки</h2>
      <div class="space-y-1">
        <router-link
          :to="{ name: 'home', query: { collection: 'new' } }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': $route.query.collection === 'new' }"
        >
          <i class="fas fa-star mr-3 text-gray-400"></i>
          <span>Новинки</span>
        </router-link>
        <router-link
          :to="{ name: 'home', query: { collection: 'trending' } }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': $route.query.collection === 'trending' }"
        >
          <i class="fas fa-chart-line mr-3 text-gray-400"></i>
          <span>В тренде</span>
        </router-link>
        <router-link
          :to="{ name: 'home', query: { collection: 'multiplayer' } }"
          class="flex items-center px-4 py-2 rounded-lg hover:bg-primary/10 transition"
          :class="{ 'bg-primary/20': $route.query.collection === 'multiplayer' }"
        >
          <i class="fas fa-users mr-3 text-gray-400"></i>
          <span>Мультиплеер</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const categories = ref([
  'Action',
  'Adventure',
  'Puzzle',
  'Strategy',
  'Racing',
  'Sports'
])

const isActive = (category) => {
  return route.query.category === category
}

const getCategoryIcon = (category) => {
  const icons = {
    'Action': 'fas fa-gamepad',
    'Adventure': 'fas fa-map',
    'Puzzle': 'fas fa-puzzle-piece',
    'Strategy': 'fas fa-chess',
    'Racing': 'fas fa-car',
    'Sports': 'fas fa-futbol'
  }
  return icons[category] || 'fas fa-gamepad'
}
</script>

<style scoped>
.router-link-active {
  @apply bg-primary/20 text-white;
}
</style> 