<template>
  <div class="container">
    <div style="display:flex;align-items:center;margin-bottom:20px;">
      <img :src="profile.avatar || 'https://picsum.photos/seed/avatar/100'" style="width:100px;height:100px;border-radius:50%;margin-right:20px;" />
      <div>
        <h2>{{ profile.display_name || 'Anonymous' }}</h2>
        <p>Balance: {{ profile.balance }} USD</p>
      </div>
    </div>
    <h2>Payment History</h2>
    <el-table :data="payments" style="width: 100%">
      <el-table-column prop="game_title" label="Game" />
      <el-table-column prop="amount" label="Amount" />
      <el-table-column prop="currency" label="Currency" />
      <el-table-column prop="status" label="Status" />
      <el-table-column prop="created" label="Date" />
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const payments = ref([]);
const profile = ref({ display_name:'', avatar:'', balance:0 });

onMounted(async () => {
  try {
    const res = await axios.get('/api/payments/');
    payments.value = res.data.map(p => ({
      ...p,
      game_title: p.game,
    }));
    const prof = await axios.get('/api/auth/profile/', { headers: authHeader() });
    profile.value = prof.data;
  } catch (e) {
    console.log('Not logged in');
  }
});

function authHeader(){
  const token = JSON.parse(sessionStorage.getItem('wg_sdk_token')||'{}');
  return token.access ? { Authorization:`Bearer ${token.access}` } : {};
}
</script>

<style scoped>
.image {
  /* Add your styles here */
}
</style> 