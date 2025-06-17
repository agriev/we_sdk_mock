<template>
  <div class="flex">
    <!-- sidebar -->
    <div class="w-64 bg-bg-block min-h-screen p-4 hidden md:block">
      <template v-for="group in groups" :key="group.title">
        <h3 class="text-xs uppercase tracking-wider text-gray-400 font-bold mt-6 mb-3 first:mt-0">{{ group.title }}</h3>
        <ul>
          <li v-for="item in group.items" :key="item.key" class="mb-2">
            <a href="#" @click.prevent="selectCat(item.key)" :class="cat===item.key ? 'text-primary' : 'hover:text-primary'" class="text-sm capitalize">{{ item.label }}</a>
          </li>
        </ul>
      </template>
    </div>
    <!-- main -->
    <div class="flex-1 px-6 py-4">
      <!-- Hero carousel -->
      <Splide v-if="filteredPopular.length" :options="{ type: 'loop', autoplay: true, interval: 5000, pauseOnHover: true }" class="mb-8">
        <SplideSlide v-for="game in filteredPopular.slice(0, 5)" :key="game.id">
          <div class="relative rounded-lg overflow-hidden shadow-xl">
            <img :src="game.thumbnail || `https://picsum.photos/seed/${game.id}/800/240`" class="w-full h-56 object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
            <div class="absolute bottom-4 left-6 z-10">
              <h2 class="text-2xl font-bold mb-2">{{ game.title }}</h2>
              <p class="text-sm text-gray-300 mb-2 line-clamp-2 max-w-xl">{{ game.description }}</p>
              <div class="flex items-center gap-4">
                <span class="text-xs text-gray-400">{{ game.opens || 0 }} игроков</span>
                <router-link :to="{ name: 'game', params: { slug: game.slug } }">
                  <button class="btn-primary">Играть</button>
                </router-link>
              </div>
            </div>
          </div>
        </SplideSlide>
      </Splide>

      <h1 class="text-2xl font-semibold mb-4">Популярные игры</h1>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="game in filteredGames" :key="game.id" class="bg-bg-block rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition flex flex-col">
          <img :src="game.thumbnail || `https://picsum.photos/seed/${game.id}b/300/150`" class="w-full h-32 object-cover" />
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="font-semibold text-lg mb-1 line-clamp-2">{{ game.title }}</h3>
              <p class="text-xs text-gray-400 mb-2 line-clamp-2">{{ game.description }}</p>
            </div>
            <div class="flex items-center justify-between mt-2">
              <span class="text-xs text-gray-500">{{ game.opens || 0 }} игроков</span>
              <router-link :to="{ name: 'game', params: { slug: game.slug } }">
                <button class="btn-primary">Играть</button>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useRoute, useRouter } from 'vue-router';
import { Splide, SplideSlide } from '@splidejs/vue-splide';
import '@splidejs/splide/css';

const games = ref([]);
const popular = ref([]);
const route = useRoute();
const router = useRouter();

const cats = ['all','action','puzzle','casual','strategy'];
const groups = [
  {title:'Жанры',items: cats.map(c=>({key:c,label:c}))},
];

const cat = ref(route.query.cat || 'all');

const filteredGames = computed(() => {
  let filtered = games.value

  // Category filter
  if (route.query.category) {
    filtered = filtered.filter(game => game.category === route.query.category)
  }

  // Popular filter
  if (route.query.popular === 'true') {
    filtered = filtered.sort((a, b) => (b.opens || 0) - (a.opens || 0))
  }

  // Collection filters
  if (route.query.collection) {
    switch (route.query.collection) {
      case 'new':
        filtered = filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        break
      case 'trending':
        filtered = filtered.sort((a, b) => (b.opens || 0) - (a.opens || 0))
        break
      case 'multiplayer':
        filtered = filtered.filter(game => game.category === 'Action' || game.category === 'Strategy')
        break
    }
  }

  return filtered
});

const filteredPopular = computed(()=>{
  if(cat.value==='all') return popular.value;
  return popular.value.filter(g=>g.category===cat.value);
});

onMounted(async () => {
  const res = await axios.get('/api/games/');
  games.value = res.data;
  popular.value = [...res.data]
    .sort((a,b)=>b.opens - a.opens)
    .slice(0,4);
});

function selectCat(c){ cat.value=c; }

watch(cat,(v)=>{
  router.replace({query:{cat: v==='all'?undefined:v}});
});
</script>

<style scoped>
.image {
  width: 100%;
  display: block;
}
</style> 