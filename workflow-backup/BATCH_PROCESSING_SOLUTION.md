# Workflow Backup - Memory & SHA Issues Fix

## Problem 1: Out of Memory (OOM)
The workflow crashes at "Check File Exists" because it tries to process all 70+ workflows simultaneously, exhausting server memory.

## Problem 2: SHA Swapping (409 Conflict errors)
Even when not crashing, 2 of 13 workflows fail with 409 Conflict errors. The error message reveals SHAs getting paired with the wrong workflow:
```
"is at 2b9d81113699151adfa1df1320d2277c2c2dd273 but expected 297bcca782010439d8ea74ab3b00d40c9954cde8"
```
This happens because `$input.all()` in "Determine Operation" matches responses to prepared data by index — but when items process in parallel, the order is not guaranteed.

## Solution: Two Changes Required

**Both fixes are needed together:**
1. **Split In Batches** — prevents OOM by limiting concurrent workflows
2. **Merge GitHub Response node** — fixes SHA swapping by keeping data paired per-item

---

## Fix 1: Add Split In Batches Node

### Position
Between **"Parse Workflow List"** and **"Get Workflow Details"**

### Configuration
- **Batch Size**: `5` (conservative; increase to 10 once confirmed working)
- **Options → Reset**: ON

### Connections
| From | To | Port |
|------|----|------|
| Parse Workflow List | Split In Batches | input |
| Split In Batches | Get Workflow Details | **Loop** output |
| Commit to GitHub | Split In Batches | loop back |
| Split In Batches | Generate Summary | **Done** output |

The **Done** output fires only once — after ALL batches complete. Connect it to Generate Summary so the report runs at the end.

---

## Fix 2: Add Merge GitHub Response Node

### Position
Between **"Check File Exists"** and **"Determine Operation"**

### Code
Use: [merge_github_response.js](merge_github_response.js)

This node uses `$node["Prepare for GitHub"].item.json` which respects the `pairedItem` relationship — keeping each workflow's data correctly bound to its own GitHub response, regardless of execution order.

### Update Determine Operation
Use: [determine_operation.js](determine_operation.js)

This reads from `$input.item.json` which now contains the merged data from the previous node.

---

## Final Workflow Structure

```
Schedule Trigger
    ↓
Get All Workflows
    ↓
Parse Workflow List
    ↓
Split In Batches ──────────────────────────────── Done ──→ Generate Summary
    ↓ (Loop)                                                      ↑
Get Workflow Details                                              │
    ↓                                                             │
Prepare for GitHub                                                │
    ↓                                                             │
Check File Exists                                                 │
    ↓                                                             │
Merge GitHub Response                                             │
    ↓                                                             │
Determine Operation                                               │
    ↓                                                             │
Commit to GitHub                                                  │
    ↓                                                             │
Finalize Commit ──────────────────────────────────────────────────┘
                (loops back to Split In Batches for next batch)
```

---

## Why Each Fix Is Needed

| Problem | Without Batching | Without Merge Node |
|---------|-----------------|---------------------|
| OOM crash | Happens with 70+ workflows | Not affected |
| SHA 409 errors | Happens (~2/13 failures) | Happens (~2/13 failures) |
| Both together | ✅ Fixed | ✅ Fixed |

---

## Batch Size Recommendations

| Size | Notes |
|------|-------|
| `5`  | Conservative — start here, safest |
| `10` | Recommended once stable |
| `20` | Faster, needs more memory |

---

## Verifying the Fix

After running, check Generate Summary output. Expected:
```json
{
  "totalWorkflows": 13,
  "successful": 13,
  "failed": 0
}
```

If you still see 409 errors, the SHA being sent doesn't match what GitHub has — likely means two consecutive runs tried to update the same file before the first commit propagated. Reduce batch size or add a short wait between batches.
