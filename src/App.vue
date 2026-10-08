<template>
  <header class="nav">
    <RouterLink to="/">Главная</RouterLink>
    <RouterLink to="/gallery">Галерея</RouterLink>
  </header>
  <main>
    <RouterView />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #111;
  color: #eee;
}
a {
  color: inherit;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.nav {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #333;
}
.nav a {
  text-decoration: none;
  opacity: 0.7;
}
.nav a.router-link-exact-active {
  opacity: 1;
  font-weight: 600;
}
</style>
