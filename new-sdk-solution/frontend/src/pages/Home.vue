<template>
  <div class="container">
    <h1>Popular</h1>
    <el-row :gutter="20" v-if="popular.length">
      <el-col :span="6" v-for="game in popular" :key="game.id">
        <el-card :body-style="{ padding: '10px' }" style="margin-bottom:20px;">
          <img :src="game.thumbnail || 'https://picsum.photos/seed/1/300/150'" class="image" />
          <div style="padding: 14px;">
            <span>{{ game.title }}</span>
            <div class="bottom clearfix">
              <router-link :to="{ name: 'game', params: { slug: game.slug } }">
                <el-button type="primary" size="small">Play</el-button>
              </router-link>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <h1 style="margin-top:30px;">All Games</h1>
    <el-row :gutter="20">
      <el-col :span="6" v-for="game in games" :key="game.id">
        <el-card :body-style="{ padding: '10px' }" style="margin-bottom:20px;">
          <img :src="game.thumbnail || 'https://picsum.photos/seed/2/300/150'" class="image" />
          <div style="padding: 14px;">
            <span>{{ game.title }}</span>
            <div class="bottom clearfix">
              <router-link :to="{ name: 'game', params: { slug: game.slug } }">
                <el-button type="primary" size="small">Play</el-button>
              </router-link>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const games = ref([]);
const popular = ref([]);

onMounted(async () => {
  const res = await axios.get('/api/games/');
  games.value = res.data;
  popular.value = [...res.data]
    .sort((a,b)=>b.opens - a.opens)
    .slice(0,4);
});
</script>

<style scoped>
.image {
  width: 100%;
  display: block;
}
</style> 