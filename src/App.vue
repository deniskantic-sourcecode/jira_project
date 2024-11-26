<template>
  <v-app style="width: 100%; max-height: 100vh" class="pa-0">
    <v-app-bar color="primary" class="pa-0 d-flex align-center navbar">
      <v-btn
        class="btn-priority"
        style="height: 100%"
        @click="filterByPriority('Highest')"
      >
        Highest Priority
      </v-btn>
      <v-btn
        class="btn-priority"
        style="height: 100%; margin-left: 10px"
        @click="filterByPriority('High')"
      >
        High Priority
      </v-btn>
      <v-btn
        class="btn-priority"
        style="height: 100%; margin-left: 10px"
        @click="filterByPriority('Medium')"
      >
        Medium Priority
      </v-btn>
      <v-btn
        class="btn-priority"
        style="height: 100%; margin-left: 10px"
        @click="filterByPriority('Lowest')"
      >
        Low Priority
      </v-btn>
    </v-app-bar>
    <div v-if="is_loading">Loading...</div>

    <div style="width: 100; height: 95vh">
      <v-row v-if="!is_loading">
        <v-col cols="12">
          <v-data-table
            class="elevation-1"
            :headers="headers"
            :items="filteredData"
            :items-per-page="20"
            item-key="id"
          >
            <template v-if="!is_loading" v-slot:item="props">
              <tr>
                <td>
                  <v-row align="center" no-gutters>
                    <v-col class="d-flex" cols="auto">
                      <v-img
                        :src="props.item.user_image"
                        width="25"
                        height="25"
                        class="rounded-circle"
                        alt="User Avatar"
                      />
                    </v-col>

                    <v-col class="d-flex align-center ml-2" cols="auto">
                      {{ props.item.username }}
                    </v-col>
                  </v-row>
                </td>
                <td>{{ props.item.statusCounts }}</td>
                <td>
                  <v-row align="center" no-gutters>
                    <v-col class="d-flex" cols="auto">
                      <v-img
                        :src="props.item.user_image"
                        width="25"
                        height="25"
                        class="rounded-circle"
                        alt="User Avatar"
                      />
                    </v-col>

                    <v-col class="d-flex align-center ml-2" cols="auto">
                      {{ props.item.username }}
                    </v-col>
                  </v-row>
                </td>
                <td>
                  <v-chip text-color="black" label>
                    {{ props.item.priority }}
                  </v-chip>
                </td>

                <td>{{ props.item.summary }}</td>
                <td>
                  {{ props.item.timespent }}
                </td>
                <td>{{ props.item.created_at }}</td>
              </tr>
            </template>
          </v-data-table>
        </v-col>
      </v-row>
    </div>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        { text: "User" },
        { text: "Tickets total" },
        { text: "Open" },
        { text: "Work in progress" },
        { text: "Waiting on support" },
        { text: "Waiting on client" },
        { text: "Ready for production" },
      ],
      data_result: [],
      filteredData: [],
      is_loading: false,
    };
  },

  methods: {
    get_data() {
      this.is_loading = true;
      let api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22&maxResults=1000"; // Set a large enough number for maxResults

      let usersData = {}; // Object to store user-specific data

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY);

      this.$http({
        method: "GET",
        url: api_url,
        headers: {
          Authorization: authHeader,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          const data_from = response.data.issues;
          console.log("ALL DATA", data_from);

          // Define possible statuses
          const statuses = [
            "Open",
            "Work in progress",
            "Waiting on support",
            "Waiting on client",
            "Ready for production",
          ];

          // Loop through issues and group them by user
          data_from.forEach((x) => {
            const userId = x.fields.assignee
              ? x.fields.assignee.displayName
              : "Unassigned"; // User ID (name)
            const status = x.fields.status.name; // Status of the issue
            const userImage = x.fields.assignee
              ? x.fields.assignee.avatarUrls["48x48"]
              : null; // User image URL

            // Initialize user structure if not already present
            if (!usersData[userId]) {
              usersData[userId] = {
                username: userId,
                user_image: userImage,
                statusCounts: {}, // Will hold counts for each status
              };

              // Initialize counts for each status to 0
              statuses.forEach((status) => {
                usersData[userId].statusCounts[status] = 0; // Set initial count to 0 for each status
              });
            }

            // Increment status count for the user
            if (usersData[userId].statusCounts[status] !== undefined) {
              usersData[userId].statusCounts[status] += 1; // Increment the count for the status
            }
          });

          // Convert usersData object to an array for rendering
          this.usersStats = Object.values(usersData);
          console.log("User Stats with Status Counts:", this.usersStats);

          // Assign the final data for further usage
          this.filteredData = this.usersStats;
          this.data_result = this.usersStats;
        })
        .catch((error) => {
          console.log("ERROR", error);
          this.is_loading = false;
        })
        .finally(() => {
          this.is_loading = false;
        });
    },
  },

  mounted() {
    this.is_loading = true;
    this.get_data();
    // console.log("ENV", process.env.VUE_APP_EMAIL); // Logs your email
    // console.log("ENV", process.env.VUE_APP_API_KEY);
  },
};
</script>

<style>
.navbar {
  padding: 0;
  margin: 0;
}

.v-img.rounded-circle {
  border-radius: 50%;
}
</style>
