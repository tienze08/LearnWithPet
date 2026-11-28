import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Pet, PET_VARIANTS } from "@/components/PixiPet/Pet";
import { type PetVariant } from "@/lib/store";
import { useMeQuery, useOnboardingMutation } from "@/hooks/queries/user.queries";
import helloCat from "@/assets/cat/sit.png";
import { Logo } from "./Logo";
import { WelcomeScene } from "./WelcomeScene";

const avatarMap = {
  FOX: "🦊",
  PANDA: "🐼",
  KOALA: "🐨",
  FROG: "🐸",
  MONKEY: "🐵",
  UNICORN: "🦄",
  TIGER: "🐯",
  PENGUIN: "🐧",
  OCTOPUS: "🐙",
  STAR: "🌟",
  ROCKET: "🚀",
  CLOVER: "🍀",
} as const;
const AVATARS = Object.keys(avatarMap) as Array<keyof typeof avatarMap>;

/** The reference's six onboarding steps. Only the welcome step lives on this screen; level, goal and time are on /app/path/setup. */
const STEPS = [
  "Chào mừng",
  "Trình độ",
  "Mục tiêu",
  "Thời gian học",
  "Cách học",
  "Hoàn tất",
] as const;

/**
 * Onboarding: the same two real steps as before (avatar, then pet species and name) behind a welcome step,
 * with the reference's stepper and mascot scene. Submits exactly what the old screen did.
 */
export function WelcomeFlow() {
  const { data: me } = useMeQuery();
  const nav = useNavigate();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<keyof typeof avatarMap>("FOX");
  const [variant, setVariant] = useState<PetVariant>("CAT");
  const [petName, setPetName] = useState("Pip");
  const onboarding = useOnboardingMutation();

  async function finish() {
    try {
      await onboarding.mutateAsync({ avatarType: avatar, petName, petSpecies: variant });
      nav({ to: "/app" });
    } catch {
      // the error block below reads onboarding.isError
    }
  }

  useEffect(() => {
    if (!me) return;
    if (me.pet?.species) setVariant(me.pet.species as PetVariant);
    if (me.pet?.name) setPetName(me.pet.name);
  }, [me]);

  const field =
    "mt-2 w-full rounded-2xl border border-input bg-sheet px-4 py-3 text-lg font-semibold outline-none focus:border-primary focus:outline-2 focus:outline-offset-2 focus:outline-ring";

  return (
    <div className="grid min-h-screen place-items-center p-4 sm:p-8">
      <div className="ref-card grid h-[min(920px,calc(100vh-4rem))] w-full max-w-[1040px] overflow-hidden md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden flex-col gap-16 border-r border-border/60 bg-[#f7f0e6]/70 px-6 pb-6 pt-16 md:flex">
          <Logo teal />
          <ol aria-label="Các bước" className="relative space-y-[1.4rem]">
            <span
              aria-hidden
              className="absolute bottom-4 left-[1.45rem] top-4 w-px bg-[#d9d2c3]"
            />
            {STEPS.map((label, i) => {
              const active = step === 0 && i === 0;
              const done = step > 0 && i === 0;
              return (
                <li
                  key={label}
                  aria-current={active ? "step" : undefined}
                  className={`relative flex min-h-11 items-center gap-3 rounded-full px-3 text-[0.9rem] ${
                    active ? "bg-primary-soft font-semibold" : "text-foreground/80"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-[1.4rem] w-[1.4rem] shrink-0 place-items-center rounded-full ${
                      active || done ? "bg-primary text-primary-foreground" : "bg-[#d8d3c8]"
                    }`}
                  >
                    {done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
                    )}
                  </span>
                  {label}
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="relative min-w-0 bg-[linear-gradient(160deg,#fbf6ee,#f6ece0)] p-7 sm:p-10">
          {step === 0 && <WelcomeScene />}
          <div
            className={`relative z-10 flex h-full max-w-[32rem] flex-col ${step === 0 ? "justify-start pt-[25.5%]" : "justify-center"}`}
          >
            <p className="mb-4 text-xs font-semibold studio-muted md:hidden">
              Bước {step + 1}/3 · {["Chào mừng", "Hồ sơ", "Bạn đồng hành"][step]}
            </p>

            {step === 0 && (
              <>
                <h1 className="studio-head text-[2.7rem] leading-[1.12] sm:text-[3.1rem]">
                  Chào mừng bạn
                  <br />
                  đến với VocaPet!
                </h1>
                <p className="mt-8 text-[1.25rem] leading-[1.7] text-foreground/80">
                  Cùng học tiếng Nhật thật vui
                  <br />
                  với người bạn nhỏ đáng yêu nhé!
                </p>
              </>
            )}

            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="studio-head text-3xl leading-tight sm:text-4xl">
                    Chúng mình gọi bạn là gì nhỉ?
                  </h1>
                  <p className="text-sm studio-muted">
                    Tên và ảnh đại diện sẽ hiện trên hồ sơ và thẻ tiến độ của bạn.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="display-name"
                    className="text-xs font-semibold uppercase tracking-wider studio-muted"
                  >
                    Tên hiển thị
                  </label>
                  <input
                    id="display-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ví dụ: Minh"
                    autoFocus
                    className={field}
                  />
                </div>
                <fieldset>
                  <legend className="text-xs font-semibold uppercase tracking-wider studio-muted">
                    Chọn ảnh đại diện
                  </legend>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {AVATARS.map((type) => (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={avatar === type}
                        aria-label={type.toLowerCase()}
                        onClick={() => setAvatar(type)}
                        className={`grid aspect-square place-items-center rounded-2xl border text-2xl transition-colors ${
                          avatar === type
                            ? "border-primary bg-primary-soft"
                            : "border-border bg-sheet hover:bg-primary-soft/60"
                        }`}
                      >
                        <span aria-hidden>{avatarMap[type]}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="ref-chip min-h-11 gap-2"
                  >
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!name.trim()}
                    className="studio-btn min-h-12 px-6"
                  >
                    Tiếp tục
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h1 className="studio-head text-3xl leading-tight sm:text-4xl">
                    Chọn bạn đồng hành
                  </h1>
                  <p className="text-sm studio-muted">
                    Người bạn nhỏ này sẽ cùng bạn học, lớn lên và giữ chuỗi ngày học.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {PET_VARIANTS.map((v) => {
                    const selected = variant === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setVariant(v.id)}
                        className={`relative rounded-2xl border p-3 text-left transition-colors ${
                          selected
                            ? "border-primary bg-primary-soft"
                            : "border-border bg-sheet hover:bg-primary-soft/50"
                        }`}
                      >
                        {selected && (
                          <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Check aria-hidden className="h-3 w-3" />
                          </span>
                        )}
                        <span className="flex justify-center">
                          <Pet variant={v.id} mood={selected ? "excited" : "happy"} size={72} />
                        </span>
                        <span className="mt-1 block text-center font-semibold">{v.name}</span>
                        <span className="block text-center text-[11px] leading-tight studio-muted">
                          {v.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label
                    htmlFor="pet-name"
                    className="text-xs font-semibold uppercase tracking-wider studio-muted"
                  >
                    Đặt tên cho bạn đồng hành
                  </label>
                  <input
                    id="pet-name"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                    placeholder="Ví dụ: Mochi"
                    className={`${field} sm:max-w-xs`}
                  />
                </div>
                {onboarding.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    Chưa lưu được. Thử lại nhé.
                  </p>
                )}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="ref-chip min-h-11 gap-2"
                  >
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={finish}
                    disabled={onboarding.isPending}
                    className="studio-btn min-h-12 px-6"
                  >
                    Bắt đầu học
                    <ArrowRight aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          {step === 0 && (
            <>
              <div className="pointer-events-none absolute bottom-[20.5%] right-[1.5%] z-10 w-[43%]">
                <div
                  aria-hidden
                  className="absolute -bottom-[3%] left-[4%] h-[9%] w-[92%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(232,196,170,.55),transparent)]"
                />
                <img
                  src={helloCat}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="relative h-auto w-full drop-shadow-[0_6px_10px_rgba(60,70,50,.12)]"
                />
              </div>
              <div className="absolute bottom-[9.5%] left-10 z-10 flex items-center gap-10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="studio-btn gap-3"
                  style={{
                    minHeight: "4.25rem",
                    padding: "0 3.25rem",
                    borderRadius: 999,
                    fontSize: "1.3rem",
                    boxShadow: "0 8px 18px rgba(31,90,69,.25)",
                  }}
                >
                  Bắt đầu
                  <ArrowRight aria-hidden className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={finish}
                  disabled={onboarding.isPending}
                  className="min-h-11 text-sm font-medium text-foreground/70 hover:text-foreground"
                >
                  Bỏ qua
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
