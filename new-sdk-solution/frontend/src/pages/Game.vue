<template>
  <div class="container">
    <el-button type="primary" @click="back">Back</el-button>
    <iframe :src="iframeSrc" frameborder="0" class="game-frame"></iframe>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const game = ref(null);
const iframeSrc = ref('');

function back() {
  router.back();
}

onMounted(async () => {
  const res = await axios.get(`/api/games/${route.params.slug}/`);
  game.value = res.data;
  iframeSrc.value = game.value.launch_url;
  // increment opens
  try { await axios.post(`/api/games/${route.params.slug}/open/`); } catch(e){}
});
</script>

<style scoped>
.game-frame {
  width: 100%;
  height: 80vh;
}
</style> 