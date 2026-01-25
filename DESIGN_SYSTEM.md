# SubTrkr Design System
## **Financial Precision meets Soft Brutalism**

---

## ✅ **What's Been Updated**

### **1. Global Typography System**

**Fonts:**
- **Archivo** (400-900 weights) - Primary font for everything
  - Headers: 800 weight, -0.03em letter-spacing
  - Body: 500 weight, -0.01em letter-spacing
  - Buttons: 700 weight
  - Nav items: 600-700 weight
- **JetBrains Mono** (400-700 weights) - Data precision font
  - All inputs, selects, textareas
  - Numerical displays (amounts, dates, counts)
  - Badge components
  - Status codes

**Why This Works:**
- **Archivo's bold weights** create visual hierarchy and command attention
- **JetBrains Mono** makes financial data feel precise and trustworthy
- **Tight letter-spacing** on headers gives modern, editorial feel
- **Monospace inputs** emphasize data entry as critical financial actions

---

### **2. Enhanced Micro-Interactions**

**Cards:**
- Lift on hover (`translateY(-1px)`)
- Shadow elevation increase
- Smooth spring easing

**Buttons:**
- Lift on hover with enhanced shadow
- Press down on active state
- Brand glow shadow on primary buttons

**Nav Items:**
- Slide right on hover (`translateX(2px)`)
- Weight increase when active (700)

**Inputs:**
- 2px borders (up from 1px) for brutalist structure
- Lift on focus with subtle green shadow
- Border color transitions on hover

**Dropdowns:**
- Slide down entrance animation
- Spring easing for natural feel

---

### **3. New Animation System**

**Available Animations:**
```css
.stagger-item          /* Sequential slide-up entrance (6 items) */
.animate-in            /* Simple fade in */
.zoom-in-95            /* Scale entrance */
.animate-shake         /* Error shake */
.animate-pulse-subtle  /* Loading state */
.shimmer               /* Skeleton loader effect */
```

**Easing Curves:**
- `var(--ease-out-expo)` - Snappy, responsive (0.16, 1, 0.3, 1)
- `var(--ease-spring)` - Playful bounce (0.34, 1.56, 0.64, 1)

---

### **4. Updated Color System**

Added missing tokens:
- `--bg-default` - Intermediate background shade
- `--brand-primary-light` - 15% opacity overlay
- `--accent-green` / `--accent-green-muted` - Success states

---

### **5. Component-Specific Improvements**

**StatusChangeDialog** ✨ (Completely Redesigned)
- Bold Archivo headers (1.75rem, 800 weight)
- JetBrains Mono for subscription name
- Status-specific color gradients with glows
- Shimmer effect on colored header bar
- Staggered field entrance animations
- Inline date feedback showing real impact
- Calendar icons on labels
- Micro-typography for OPTIONAL tags

---

## 🎨 **Components That Need Visual Refresh**

### **Priority 1: Critical UX Components**

#### **1. Dashboard Stats Cards** ⚠️
**Current Issues:**
- Generic card layout
- Numbers don't feel important enough
- No visual hierarchy between metrics

**Recommended Changes:**
- Make primary numbers **HUGE** (3.5rem) in Archivo 800
- Add subtle gradient backgrounds per metric type
- Use JetBrains Mono for all numerical values
- Add animated counter on page load
- Include sparkline micro-charts showing trend
- Add stagger animation on card entrance

**Example:**
```tsx
<div className="stagger-item card">
  <div className="label">Monthly Spending</div>
  <h1 className="font-mono" style={{ fontSize: '3.5rem', fontWeight: 800 }}>
    $2,450
  </h1>
  <div className="trend">↑ 12% from last month</div>
</div>
```

---

#### **2. Item Cards in ItemList** ⚠️
**Current Issues:**
- Status badges lack visual impact
- Amounts should feel more prominent
- Category indicator is small/forgettable

**Recommended Changes:**
- **Larger status badges** with gradients matching StatusChangeDialog
- **Monospace amounts** (1.5rem, 700 weight)
- **Thicker category color bar** (6px left border instead of icon)
- **Hover state:** Lift + glow shadow in category color
- **Entrance animation:** Stagger on list load

**Example Structure:**
```tsx
<div className="stagger-item card" style={{ borderLeft: `6px solid ${categoryColor}` }}>
  {status !== 'active' && (
    <div className="badge" style={{ background: gradientForStatus }}>
      {statusLabel}
    </div>
  )}
  <h3 className="font-mono text-2xl font-bold">{amount}</h3>
  <p className="text-sm text-secondary">{name}</p>
</div>
```

---

#### **3. ItemForm Modal** ⚠️
**Current Issues:**
- Generic modal styling
- Labels don't match new label system
- Missing entrance animation

**Recommended Changes:**
- Match StatusChangeDialog structure:
  - Colored header bar (brand green)
  - Icon box with gradient + glow
  - Archivo 800 headers
- **ALL labels:** Uppercase, 0.6875rem, 600 weight, 0.08em spacing
- **ALL inputs:** JetBrains Mono, 2px borders
- **Entrance animation:** Scale + fade
- **Field stagger:** Sequential slide-up
- **Amount input:** Make it HUGE (1.5rem) since it's most important

---

#### **4. Analytics Charts** ⚠️
**Current Issues:**
- Chart labels use default fonts
- Numbers in tooltips aren't monospace
- No entrance animations

**Recommended Changes:**
- **All chart text:** Archivo 600
- **All numbers:** JetBrains Mono 600
- **Axis labels:** Uppercase, 0.08em spacing
- **Tooltip styling:** Match card style with gradient header
- **Chart entrance:** Fade + slide up with 0.3s delay
- **Bar hover:** Lift effect + glow in category color

---

#### **5. Upcoming Payments Section** ⚠️
**Current Issues:**
- Items blend together
- Amounts should be more prominent
- Days until doesn't feel urgent enough

**Recommended Changes:**
- **Gradient backgrounds** based on urgency:
  - Due today: Red gradient glow
  - 1-3 days: Amber gradient glow
  - 4-7 days: Neutral
- **Monospace amounts:** 1.125rem, 700 weight
- **Bold days until:** Archivo 700, colored by urgency
- **Hover:** Scale up slightly (1.02) + shadow
- **Stagger entrance animation**

---

#### **6. Category Badges** ⚠️
**Current Issues:**
- Too small, easy to miss
- Generic pill shape
- No visual personality

**Recommended Changes:**
- **Monospace category names** (JetBrains Mono 600)
- **Thicker category dot** (10px instead of 8px)
- **Darker background** with subtle border
- **Hover:** Glow in category color
- **Consider:** Brutalist square shape instead of pill

---

### **Priority 2: Nice-to-Have Polish**

#### **7. Sidebar Navigation**
- Add subtle icons next to text
- Active state: Add left border accent (4px green)
- Entrance: Stagger animation on app load
- Consider: Collapsible with icon-only mode

#### **8. Theme Toggle Button**
- Make it more playful/memorable
- Add sun/moon icon animation (rotate + scale)
- Tooltip showing current theme
- Consider: Gradient button background

#### **9. Error Toast Messages**
- Match StatusChangeDialog error styling
- Add icon + close button
- Slide in from top-right
- Auto-dismiss with progress bar

#### **10. Empty States**
- Larger, bolder messaging
- Illustration or icon with gradient
- Call-to-action button with primary style
- Fade + scale entrance

---

## 🎯 **Design Principles**

### **Typography Hierarchy**
1. **Display (Archivo 800):** Page titles, dialog headers, hero numbers
2. **Heading (Archivo 700):** Section headers, card titles
3. **Body (Archivo 500):** General text, descriptions
4. **Label (Archivo 600 uppercase):** Form labels, metadata
5. **Data (JetBrains Mono 500-700):** Numbers, dates, codes, inputs

### **Color Usage**
- **Gradients > Flat colors** for important actions
- **Glows** to emphasize status/importance
- **Muted variants** for backgrounds, never pure colors
- **Borders:** Always 2px for brutalist structure

### **Animation Timing**
- **Entrance:** 0.3-0.4s (feel substantial, not rushed)
- **Interactions:** 0.2s (responsive, immediate)
- **Loading:** 1.5-2s loops (not distracting)
- **Stagger delay:** 0.05s per item (smooth sequence)

### **Spacing**
- **Card padding:** 1.5rem (24px) minimum
- **Section gaps:** 1.5-2rem (24-32px)
- **Input padding:** 0.875-1rem vertical (14-16px)
- **Border radius:** 0.75-1rem (12-16px)

---

## 📋 **Implementation Checklist**

### **Immediate (Typography Consistency)**
- [x] Update global CSS with Archivo + JetBrains Mono
- [x] StatusChangeDialog redesigned
- [ ] Update Dashboard stats cards
- [ ] Update ItemList cards with new badges
- [ ] Update ItemForm to match StatusChangeDialog
- [ ] Add stagger animations to all lists

### **Next Phase (Visual Polish)**
- [ ] Redesign Analytics charts
- [ ] Enhance Upcoming Payments section
- [ ] Update Category badges
- [ ] Polish sidebar navigation
- [ ] Improve theme toggle
- [ ] Redesign error toasts
- [ ] Enhance empty states

### **Testing**
- [ ] Verify font loading (Google Fonts CDN)
- [ ] Test animations on slower devices
- [ ] Check accessibility (focus states, contrast)
- [ ] Verify dark mode looks great
- [ ] Test on mobile viewport

---

## 💡 **Quick Wins**

1. **Add `.font-mono` class** to ALL numerical displays
2. **Add `.label` class** to ALL form labels
3. **Add `.stagger-item` class** to list items for entrance animation
4. **Update all card hover** to include lift effect
5. **Add gradient + glow** to status badges

---

## 🚀 **Future Enhancements**

1. **Custom number animations** (count up on load)
2. **Micro-interactions** on savings cards (celebrate cancelled subscriptions)
3. **Confetti animation** when cancelling expensive subscriptions
4. **Timeline view** for subscription history
5. **Dark mode refinements** (deeper blacks, warmer grays)

---

**Design System Version:** 2.0
**Last Updated:** 2026-01-24
**Primary Font:** Archivo (400-900)
**Mono Font:** JetBrains Mono (400-700)
**Brand Color:** #22c55e (Green)
