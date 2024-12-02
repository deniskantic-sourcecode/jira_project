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
      <!-- <v-carousel-item>
        <component :is="task_list" />
      </v-carousel-item> -->
      <!-- 
      <v-carousel-item>
        <component :is="userList" />
      </v-carousel-item> -->

      <v-carousel-item>
        <component :is="ticket_labels" />
      </v-carousel-item>
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
      ticket_labels: null,
    };
  },
  mounted() {
    import("@/components/user_task.vue")
      .then((module) => {
        this.userList = module.default;
      })
      .catch((error) => {
        console.error("Failed to load component", error);
      });

    import("@/components/task_list.vue")
      .then((module) => {
        this.task_list = module.default;
      })
      .catch((error) => {
        console.error("Failed to load component", error);
      });
    import("@/components/ticket_labels.vue")
      .then((module) => {
        this.ticket_labels = module.default;
      })
      .catch((error) => {
        console.error("Failed to load component", error);
      });
  },
};
</script>

<style scoped>
.fill-height {
  height: 100vh;
}

.v-carousel,
.v-carousel-item {
  height: 100% !important;
}
</style>
