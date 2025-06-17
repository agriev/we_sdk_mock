<template>
  <el-card style="max-width:400px;margin:auto;margin-top:60px">
    <el-form :model="form" @submit.prevent="submit">
      <el-form-item label="Username">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="Password">
        <el-input v-model="form.password" type="password" />
      </el-form-item>
      <el-button type="primary" native-type="submit">Login</el-button>
      <el-divider>or</el-divider>
      <el-button @click="google">Login with Google</el-button>
      <p style="margin-top:15px;">No account? <router-link to="/register">Register</router-link></p>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const form = reactive({ username: '', password: '' });
const router = useRouter();

async function submit() {
  try {
    const res = await axios.post('/api/auth/login/', form);
    sessionStorage.setItem('wg_sdk_token', JSON.stringify(res.data));
    router.push('/');
  } catch (e) {
    alert('Login failed');
  }
}

function google() {
  window.location.href = '/api/auth/social/google/login/';
}
</script> 