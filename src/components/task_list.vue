<template>
  <v-app style="width: 100; height: 100%" class="pa-0">
    <div v-if="is_loading" style="background-color: red">Loading...</div>

    <div style="width: 100; background-color: red; height: 100vh !important">
      <v-row v-if="!is_loading" style="height: 100%">
        <v-col cols="12" align="center">
          <v-data-table
            class="elevation-1"
            :headers="headers"
            :items="data_result"
            item-key="id"
            :items-per-page="data_result.length"
            hide-default-footer
          >
            <template v-if="!is_loading" v-slot:item="props">
              <tr>
                <td>{{ props.item.ticket_id }}</td>
                <td>{{ props.item.ticket_name }}</td>
                <td>
                  {{ props.item.priority }}
                </td>
                <td>
                  {{ props.item.created_at }}
                </td>

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
                      {{ props.item.assignee }}
                    </v-col>
                  </v-row>
                </td>
                <td>
                  {{ props.item.due_date }}
                </td>
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
        { text: "Ticket ID" },
        { text: "Ticket Name" },
        { text: "Priority" },
        { text: "Created " },
        { text: "Assignee" },
        { text: "Due Date" },
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
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI%20AND%20assignee%20IS%20NOT%20EMPTY%20AND%20status%20!=%20%22Done%22%20AND%20(priority%20%3D%20%22High%22%20OR%20priority%20%3D%20%22Highest%22)";

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
          console.log("RESPONSE DATA", response.data);

          // Initialize data_result as an array to hold multiple issues
          this.data_result = []; // Empty array before starting to populate

          // Loop through each issue and push to data_result
          data_from.forEach((x) => {
            this.data_result.push({
              ticket_id: x.key,
              ticket_name: x.fields.summary,
              priority: x.fields.priority.name,
              created_at: x.fields.created,
              assignee: x.fields.assignee.displayName,
              user_image: x.fields.assignee
                ? x.fields.assignee.avatarUrls["48x48"]
                : null,
              due_date: x.fields.duedate,
            });
          });

          console.log("DATA RESULT", this.data_result);
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
    this.is_loading = true;
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
