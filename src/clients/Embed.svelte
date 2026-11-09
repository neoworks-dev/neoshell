<script lang="ts">
  // Another view, inside this client's tree: the host draws it, this client
  // only names it and hands it args. What it draws never comes through here.

  let { type, args, id }: { type: string; args?: unknown; id?: string } = $props()
</script>

<gtkembed view={type} props={{ args, id }}></gtkembed>
