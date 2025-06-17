<template>
  <el-menu mode="horizontal" :default-active="$route.name" class="el-menu-demo" background-color="#545c64" text-color="#fff" active-text-color="#ffd04b">
    <el-menu-item index="home" @click="go('/')">Games</el-menu-item>
    <el-menu-item index="profile" @click="go('/profile')">Profile</el-menu-item>
  </el-menu>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();
function go(path){ router.push(path); }
</script>

<style scoped>
.el-menu-demo{ border:none; }
</style> 