<template>
  <v-main>
    <!-- Carousel takes full height -->
    <v-carousel
      v-model="carouselIndex"
      hide-delimiters
      :show-arrows="false"
      cycle
      :interval="5000"
      height="100%"
    >
      <!-- Carousel item also fills the available space -->
      <v-carousel-item>
        <component :is="task_list" />
      </v-carousel-item>
      <!-- 
      <v-carousel-item>
        <component :is="userList" />
      </v-carousel-item> -->
    </v-carousel>
  </v-main>
</template>

<script>
export default {
  data() {
    return {
      carouselIndex: 0, // Index to control which slide is currently active
      userList: null,
      task_list: null,
    };
  },
  mounted() {
    // Dynamically import the components after the component is mounted
    import("@/components/user_task.vue")
      .then((module) => {
        this.userList = module.default;
      })
      .catch((error) => {
        console.error("Failed to load user_task component", error);
      });

    import("@/components/task_list.vue")
      .then((module) => {
        this.task_list = module.default;
      })
      .catch((error) => {
        console.error("Failed to load HelloWorld component", error);
      });
  },
};
</script>

<style scoped>
/* Ensures full viewport height for v-main, v-carousel, and v-carousel-item */
.fill-height {
  height: 100vh; /* 100% of the viewport height */
}

.v-carousel,
.v-carousel-item {
  height: 100% !important; /* Make carousel and its items take the full height */
}
</style>
