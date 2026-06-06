import sys
import subprocess
import os

# Ensure Pillow is installed
try:
    from PIL import Image, ImageDraw, ImageFilter
except ImportError:
    print("Pillow is not installed. Installing it now...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageDraw, ImageFilter

def interpolate_color(c1, c2, t):
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))

def create_app_icon(size):
    # Create high-res canvas with alpha channel
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    
    # 1. Create squircle mask
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    # Radius for squircle
    radius = int(size * 0.22)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    
    # 2. Draw background gradient on a separate image
    bg = Image.new("RGBA", (size, size))
    bg_draw = ImageDraw.Draw(bg)
    color_start = (10, 10, 18, 255)  # #0a0a12
    color_end = (20, 20, 36, 255)    # #141424
    
    for y in range(size):
        t = y / (size - 1)
        current_color = interpolate_color(color_start, color_end, t)
        bg_draw.line([(0, y), (size, y)], fill=current_color)
        
    # 3. Add glowing background radial orbs (purple/blue)
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    # Purple orb (left-top)
    p_cx, p_cy = int(size * 0.4), int(size * 0.35)
    p_r = int(size * 0.3)
    # Draw radial gradient via concentric circles with decreasing opacity
    for r in range(p_r, 0, -2):
        opacity = int(100 * (1.0 - (r / p_r)) ** 2)
        glow_draw.ellipse([p_cx - r, p_cy - r, p_cx + r, p_cy + r], fill=(139, 92, 246, opacity))
        
    # Blue orb (right-bottom)
    b_cx, b_cy = int(size * 0.65), int(size * 0.65)
    b_r = int(size * 0.28)
    for r in range(b_r, 0, -2):
        opacity = int(60 * (1.0 - (r / b_r)) ** 2)
        glow_draw.ellipse([b_cx - r, b_cy - r, b_cx + r, b_cy + r], fill=(59, 130, 246, opacity))
        
    # Apply heavy blur to the glow layer
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(size * 0.08))
    bg.alpha_composite(glow_layer)
    
    # 4. Glassmorphic card overlay
    glass_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glass_draw = ImageDraw.Draw(glass_layer)
    
    g_x0, g_y0 = int(size * 0.1875), int(size * 0.1875)
    g_x1, g_y1 = int(size * 0.8125), int(size * 0.8125)
    g_radius = int(size * 0.14)
    
    # Base fill
    glass_draw.rounded_rectangle([g_x0, g_y0, g_x1, g_y1], radius=g_radius, fill=(255, 255, 255, 12), outline=(255, 255, 255, 30), width=int(size * 0.006) or 1)
    bg.alpha_composite(glass_layer)
    
    # 5. Equals button/symbol gradient bars with glow
    equals_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    equals_draw = ImageDraw.Draw(equals_layer)
    
    eq_w = int(size * 0.39)
    eq_h = int(size * 0.046)
    eq_x0 = int(size * 0.305)
    eq_x1 = eq_x0 + eq_w
    eq_radius = eq_h // 2
    
    # Y positions for the two bars
    y1_0 = int(size * 0.445)
    y1_1 = y1_0 + eq_h
    y2_0 = int(size * 0.54)
    y2_1 = y2_0 + eq_h
    
    # Draw bars with gradient (purple #a78bfa to blue #3b82f6)
    c_start = (167, 139, 250, 255)
    c_end = (59, 130, 246, 255)
    
    # Draw horizontal gradients on the equal bars
    for x in range(eq_x0, eq_x1):
        t = (x - eq_x0) / eq_w
        color = interpolate_color(c_start, c_end, t)
        equals_draw.line([(x, y1_0), (x, y1_1)], fill=color)
        equals_draw.line([(x, y2_0), (x, y2_1)], fill=color)
        
    # Round the edges of the equals bars
    # Draw left and right circles for both bars
    for x in range(eq_radius):
        # Left caps
        t_l = 0.0
        color_l = interpolate_color(c_start, c_end, t_l)
        equals_draw.arc([eq_x0 - eq_radius, y1_0, eq_x0 + eq_radius, y1_1], 90, 270, fill=color_l)
        equals_draw.arc([eq_x0 - eq_radius, y2_0, eq_x0 + eq_radius, y2_1], 90, 270, fill=color_l)
        # Right caps
        t_r = 1.0
        color_r = interpolate_color(c_start, c_end, t_r)
        equals_draw.arc([eq_x1 - eq_radius, y1_0, eq_x1 + eq_radius, y1_1], 270, 90, fill=color_r)
        equals_draw.arc([eq_x1 - eq_radius, y2_0, eq_x1 + eq_radius, y2_1], 270, 90, fill=color_r)
        
    # Draw filled rounded rectangles using PIL's rounded_rectangle directly for clean rendering
    equals_draw.rounded_rectangle([eq_x0, y1_0, eq_x1, y1_1], radius=eq_radius, fill=None, outline=None)
    
    # Create glow for equals sign
    glow_eq = equals_layer.filter(ImageFilter.GaussianBlur(size * 0.03))
    
    # Composite glow, then standard equals layer
    # We draw equals sign again over it for sharpness
    final_eq = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_eq_draw = ImageDraw.Draw(final_eq)
    final_eq_draw.rounded_rectangle([eq_x0, y1_0, eq_x1, y1_1], radius=eq_radius, fill=(139, 92, 246, 255))
    final_eq_draw.rounded_rectangle([eq_x0, y2_0, eq_x1, y2_1], radius=eq_radius, fill=(59, 130, 246, 255))
    
    bg.alpha_composite(glow_eq)
    bg.alpha_composite(final_eq)
    
    # 6. Add grid dots
    grid_color = (255, 255, 255, 38) # white 15% opacity
    r_dot = int(size * 0.012) or 2
    
    col_xs = [int(size * 0.3125), int(size * 0.4375), int(size * 0.5625), int(size * 0.6875)]
    row_ys = [int(size * 0.3125), int(size * 0.4375), int(size * 0.5625), int(size * 0.6875)]
    
    for x in col_xs:
        for y in row_ys:
            # Skip positions where equals sign overlaps
            if y in [row_ys[1], row_ys[2]] and x in [col_xs[1], col_xs[2]]:
                continue
            bg_draw.ellipse([x - r_dot, y - r_dot, x + r_dot, y + r_dot], fill=grid_color)
            
    # Top-right glowing dot
    accent_dot_color = (139, 92, 246, 255)
    ad_x, ad_y = int(size * 0.6875), int(size * 0.226)
    ad_r = int(size * 0.02) or 4
    
    # Accent dot glow
    accent_glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ag_draw = ImageDraw.Draw(accent_glow)
    ag_draw.ellipse([ad_x - ad_r*2, ad_y - ad_r*2, ad_x + ad_r*2, ad_y + ad_r*2], fill=(139, 92, 246, 120))
    accent_glow = accent_glow.filter(ImageFilter.GaussianBlur(size * 0.015))
    bg.alpha_composite(accent_glow)
    
    bg_draw.ellipse([ad_x - ad_r, ad_y - ad_r, ad_x + ad_r, ad_y + ad_r], fill=accent_dot_color)
    
    # 7. Apply squircle mask to get transparent corners
    final_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    final_img.paste(bg, (0, 0), mask=mask)
    
    return final_img

if __name__ == "__main__":
    print("Generating icon-192.png...")
    icon192 = create_app_icon(192)
    icon192.save("icon-192.png", "PNG")
    print("icon-192.png generated successfully.")
    
    print("Generating icon-512.png...")
    icon512 = create_app_icon(512)
    icon512.save("icon-512.png", "PNG")
    print("icon-512.png generated successfully.")
    
    print("All PWA icons generated.")
