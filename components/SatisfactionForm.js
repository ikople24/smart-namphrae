import React, { useState } from "react";
import Swal from "sweetalert2";
import { useTranslation } from "@/hooks/useTranslation";

const SatisfactionForm = ({ onSubmit, complaintId }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const { t } = useTranslation();

  const handleSubmit = async () => {
    console.log("📦 Submitting Satisfaction:", { complaintId, rating, comment });

    if (rating === 0) {
      Swal.fire(t.satisfaction.validationTitle, t.satisfaction.validationMessage, "warning");
      return;
    }

    const result = await Swal.fire({
      title: t.satisfaction.confirmTitle,
      text: t.satisfaction.confirmMessage,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: t.satisfaction.confirmButton,
      cancelButtonText: t.satisfaction.cancelButton,
    });

    if (!result.isConfirmed) return;

    const res = await fetch("/api/satisfaction/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complaintId, rating, comment }),
    });

    if (res.ok) {
      Swal.fire(t.satisfaction.successTitle, t.satisfaction.successMessage, "success");
      if (onSubmit) onSubmit();
    } else {
      Swal.fire(t.satisfaction.errorTitle, t.satisfaction.errorMessage, "error");
    }
  };

  return (
    <form>
      <div className="flex flex-col items-end">
        <div className="rating gap-1 animate-bounce ">
          {[1, 2, 3, 4, 5].map((star) => (
            <input
              key={star}
              type="radio"
              name="rating"
              value={star}
              onChange={() => setRating(star)}
              className="mask mask-star-2 bg-yellow-400 border-yellow-500 w-6 h-6 transition-all duration-300 ease-in-out hover:scale-110"
              aria-label={`${star} star`}
              title={`${t.satisfaction.rating}: ${star}`}
            />
          ))}
        </div>
        <p className="text-right mt-1 text-sm">{t.satisfaction.rating}: {rating}</p>

        <textarea
          className="textarea textarea-bordered w-full max-w-md mt-4"
          placeholder={t.satisfaction.commentPlaceholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary btn-sm mt-4"
        >
          {t.satisfaction.submitComment}
        </button>
      </div>
    </form>
  );
};

export default SatisfactionForm;