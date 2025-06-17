<template>
  <el-card style="max-width:400px;margin:auto;margin-top:60px">
    <el-form :model="form" @submit.prevent="submit">
      <el-form-item label="Username">
        <el-input v-model="form.username" />
      </el-form-item>
      <el-form-item label="Email">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="Password">
        <el-input v-model="form.password1" type="password" />
      </el-form-item>
      <el-form-item label="Repeat Password">
        <el-input v-model="form.password2" type="password" />
      </el-form-item>
      <el-button type="primary" native-type="submit">Register</el-button>
      <p style="margin-top:15px;">Have an account? <router-link to="/login">Login</router-link></p>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const form = reactive({ username: '', email: '', password1: '', password2: '' });
const router = useRouter();

async function submit() {
  if (form.password1 !== form.password2) {
    alert('Passwords do not match');
    return;
  }
  try {
    await axios.post('/api/auth/registration/', form);
    alert('Account created, please login');
    router.push('/login');
  } catch (e) {
    alert('Registration failed');
  }
}
</script> 