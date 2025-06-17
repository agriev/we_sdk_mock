<template>
  <el-menu mode="horizontal" :default-active="$route.name" class="el-menu-demo" background-color="#545c64" text-color="#fff" active-text-color="#ffd04b">
    <el-menu-item index="home" @click="go('/')">Games</el-menu-item>
    <template v-if="isAuth">
      <el-menu-item index="profile" @click="go('/profile')">Profile</el-menu-item>
      <el-menu-item index="logout" @click="logout">Logout</el-menu-item>
    </template>
    <template v-else>
      <el-menu-item index="login" @click="go('/login')">Login</el-menu-item>
    </template>
  </el-menu>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const router = useRouter();

function go(path){ router.push(path); }

const isAuth = computed(()=>{
  try{
    const t = JSON.parse(sessionStorage.getItem('wg_sdk_token')||'{}');
    return !!t.access;
  }catch(e){return false;}
});

function logout(){
  sessionStorage.removeItem('wg_sdk_token');
  router.push('/login');
}
</script>

<style scoped>
.el-menu-demo{ border:none; }
</style> 