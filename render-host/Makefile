# Throwaway spike: custom WPEPlatform backend -> off-screen render -> dmabuf ->
# wlr-layer-shell, driven at the layer surface's vblank.

CXX      := g++
CXXFLAGS := -std=c++20 -g -O1 -Wall -Wno-unused-parameter \
            $(shell pkg-config --cflags wpe-webkit-2.0 wpe-platform-2.0 wayland-client egl gbm libdrm xkbcommon)
LDFLAGS  := $(shell pkg-config --libs wpe-webkit-2.0 wpe-platform-2.0 wayland-client egl gbm libdrm xkbcommon) -ldrm

GEN := gen
PROTO := protocols
SCAN := wayland-scanner

PROTOCOLS := wlr-layer-shell-unstable-v1 xdg-shell linux-dmabuf-v1
PROTO_HDRS := $(addprefix $(GEN)/,$(addsuffix -client.h,$(PROTOCOLS)))
PROTO_SRCS := $(addprefix $(GEN)/,$(addsuffix -protocol.c,$(PROTOCOLS)))

SRCS := src/main.cpp src/wpe_backend.cpp src/present.cpp src/control.cpp
OBJS := $(SRCS:.cpp=.o)

all: neobar-render

$(GEN):
	mkdir -p $(GEN)

$(GEN)/%-client.h: $(PROTO)/%.xml | $(GEN)
	$(SCAN) client-header $< $@

$(GEN)/%-protocol.c: $(PROTO)/%.xml | $(GEN)
	$(SCAN) public-code $< $@

.SECONDARY:

# Ensure protocol headers exist before compiling objects.
$(OBJS): $(PROTO_HDRS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) -I$(GEN) -c $< -o $@

neobar-render: $(OBJS) $(PROTO_SRCS:.c=.o)
	$(CXX) $(OBJS) $(PROTO_SRCS:.c=.o) $(LDFLAGS) -o $@

# Compile generated protocol code as C: in C++ `const` globals get internal
# linkage, which hides the wl_interface symbols from the final link.
$(GEN)/%-protocol.o: $(GEN)/%-protocol.c
	gcc $(shell pkg-config --cflags wayland-client) -I$(GEN) -O1 -c $< -o $@

clean:
	rm -rf $(GEN) src/*.o neobar-render

.PHONY: all clean
