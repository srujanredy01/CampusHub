/**
 * Reusable hook for save/unsave toggle with optimistic UI and real-time sync.
 * Use this in any module (Coding, News, Resources, etc.) to add save functionality.
 *
 * Usage:
 *   const { isSaved, isLoading, toggle } = useSaveToggle("coding_problem", questionId);
 *   <button onClick={toggle}>{isSaved ? "Unsave" : "Save"}</button>
 */
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  saveItem,
  unsaveByObject,
  checkSavedStatus,
  optimisticSave,
  optimisticUnsave,
  revertOptimisticSave,
} from "../store/slices/savedSlice";

export function useSaveToggle(contentType, objectId) {
  const dispatch = useDispatch();
  const key = `${contentType}:${objectId}`;
  const status = useSelector((s) => s.saved.savedStatus[key]);
  const isSaved = status?.is_saved || false;
  const savedItemId = status?.saved_item_id;
  const isLoading = savedItemId === "pending";

  // Check saved status on mount if not already known
  useEffect(() => {
    if (objectId && !status) {
      dispatch(checkSavedStatus({ content_type: contentType, object_id: objectId }));
    }
  }, [dispatch, contentType, objectId, status]);

  const toggle = useCallback(async () => {
    if (!objectId || isLoading) return;

    if (isSaved) {
      // Optimistic unsave
      dispatch(optimisticUnsave({ content_type: contentType, object_id: objectId, item_id: savedItemId }));
      try {
        await dispatch(unsaveByObject({ content_type: contentType, object_id: objectId })).unwrap();
        toast.success("Removed from saved", { autoClose: 2000 });
      } catch (err) {
        // Revert — re-check status
        dispatch(checkSavedStatus({ content_type: contentType, object_id: objectId }));
        toast.error(err || "Failed to remove");
      }
    } else {
      // Optimistic save
      dispatch(optimisticSave({ content_type: contentType, object_id: objectId }));
      try {
        await dispatch(saveItem({ content_type: contentType, object_id: objectId })).unwrap();
        toast.success("Saved successfully", { autoClose: 2000 });
      } catch (err) {
        // Revert
        dispatch(revertOptimisticSave({ content_type: contentType, object_id: objectId }));
        toast.error(err || "Failed to save");
      }
    }
  }, [dispatch, contentType, objectId, isSaved, savedItemId, isLoading]);

  return { isSaved, isLoading, toggle, savedItemId };
}

export default useSaveToggle;
