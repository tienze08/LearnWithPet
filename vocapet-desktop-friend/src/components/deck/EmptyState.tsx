import { PetNote } from "@/components/learning-path/studio";

/** A deck with no words yet: the companion says what to do, the "Thêm từ" action is in the deck header. */
export default function Empty() {
  return (
    <div className="border-y border-border py-10">
      <PetNote mood="waiting" size={56}>
        Bộ thẻ này chưa có từ nào. Bấm <b>Thêm từ</b> ở trên để bắt đầu, mình học cùng bạn.
      </PetNote>
    </div>
  );
}
