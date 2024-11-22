<template>
  <v-app style="width: 100%">
    <v-app-bar app color="primary" dark> </v-app-bar>
    <v-main style="width: 100%">
      <div class="text-h4">Test</div>
      <div v-if="is_loading">Loading...</div>

      <v-container
        v-if="!is_loading"
        style="width: 100%; background-color: red"
      >
        <v-row>
          <v-col cols="12">
            <!-- Use <v-data-table> instead of <v-table> -->
            <v-data-table
              class="elevation-1"
              :headers="headers"
              :items="data_result"
              :items-per-page="20"
              item-key="id"
            >
              <template v-slot:item="props">
                <tr>
                  <td>{{ props.item.id }}</td>
                  <td>{{ props.item.key }}</td>
                  <td>{{ props.item.username }}</td>
                  <td>{{ props.item.priority }}</td>
                  <td>{{ props.item.status }}</td>
                  <td>{{ props.item.summary.substring(0, 20) + ".." }}</td>
                  <td>{{ props.item.timespent || 0 }}</td>
                  <td>{{ format_date(props.item.created_at) }}</td>
                </tr>
              </template>
            </v-data-table>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
export default {
  data() {
    return {
      headers: [
        { text: "ID", align: "start", key: "id", value: "id" },
        { text: "Key", align: "start", value: "name" },
        { text: "Username", value: "task" },
        { text: "Priority", value: "email" },
        { text: "Status", value: "status" },
        { text: "Summary", value: "summary" },
        { text: "timespent", value: "timespent" },
        { text: "Created", value: "created" },
      ],
      // Sample users data for testing

      // Pagination setup
      page: 1,
      data_result: [],
      is_loading: false,
    };
  },

  //   id: [ ].id
  // key: [ ].key

  // Username  -> [ ].fields.assignee.displayName
  // created: [ ].fields.created
  // descritpion: [ ].fields.description
  // label: [ ].fields[ array ]
  // prioriret: [ ].fields.priority {object}.name “lowest, high itd…)
  // Status : [ ].fields.status {object}.statusCategory.name (“done” in progress”)
  // Summary: [ ].fields.summary
  // timespent: [ ].fields.timespent

  methods: {
    format_date(date_string) {
      const date = new Date(date_string);
      const day = date.getDay();
      const month = date.getMonth();
      const year = date.getFullYear();

      const new_date = day + "." + month + "." + year;

      return new_date;
    },
    get_data() {
      this.is_loading = true;
      var api_url =
        "http://localhost:8010/proxy/rest/api/2/search?jql=project=PI";

      const authHeader =
        "Basic " +
        btoa(process.env.VUE_APP_EMAIL + ":" + process.env.VUE_APP_API_KEY); // This is how Basic Auth headers are built

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
          //console.log("RESPONSE", response.data);

          console.log("ISSUES", response.data);
          const data_from = response.data.issues;

          (this.data_result = data_from.map((x) => {
            return {
              id: x.id,
              key: x.key,
              username: x.fields.assignee.displayName,
              description: x.fields.description,
              // label: x.fields.labels[x],
              priority: x.fields.priority.name,
              status: x.fields.status.statusCategory.name,
              summary: x.fields.summary,
              timespent: x.fields.timespent,
              created_at: x.fields.created,
            };
          })),
            console.log("NEW DATA", this.data_result);
          this.is_loading = false;
        })
        .catch((error) => {
          console.log("ERROR", error);
        })
        .finally(() => {
          this.is_loading = false;
        });
    },
  },

  mounted() {
    this.is_loading = true;
    this.get_data();
    console.log("ENV", process.env.VUE_APP_EMAIL); // Logs your email
    console.log("ENV", process.env.VUE_APP_API_KEY);
  },
};
</script>
