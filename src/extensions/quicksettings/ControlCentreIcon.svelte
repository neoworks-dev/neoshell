<script lang="ts">
  // The Control Centre's bar icon: two small switches, one off and one on,
  // drawn from boxes so it takes the bar's text colour.
</script>

<gtkbox class="cc-glyph" orientation="vertical" spacing={2} valign="center">
  <gtkbox class="cc-glyph-switch">
    <gtkbox class="cc-glyph-knob" halign="start" valign="center"></gtkbox>
  </gtkbox>
  <gtkbox class="cc-glyph-switch">
    <gtkbox class="cc-glyph-knob" halign="end" valign="center" hexpand></gtkbox>
  </gtkbox>
</gtkbox>
