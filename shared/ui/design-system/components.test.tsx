import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ActionButton,
  ActionMenu,
  Choice,
  DesignSystem,
  Dialog,
  Field,
  IconButton,
} from "./index";

afterEach(cleanup);

describe("proposal kit native control contracts", () => {
  it("keeps native labels and combines caller, hint, and error descriptions", () => {
    render(
      <DesignSystem variant="A">
        <p id="existing">Original help</p>
        <Field
          label="Book title"
          hint="Use the printed title"
          error="A title is required"
          aria-describedby="existing"
        />
      </DesignSystem>,
    );
    const input = screen.getByLabelText("Book title");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const descriptions = input.getAttribute("aria-describedby")!.split(" ");
    expect(descriptions).toHaveLength(3);
    expect(
      descriptions.map((id) => document.getElementById(id)?.textContent),
    ).toEqual([
      "Original help",
      "Use the printed title",
      "A title is required",
    ]);
  });

  it("prevents loading actions, names icon actions, and preserves native choice events", () => {
    const action = vi.fn();
    const change = vi.fn();
    render(
      <DesignSystem variant="B" mode="dark">
        <ActionButton loading onClick={action}>
          Save
        </ActionButton>
        <IconButton label="Delete citation">×</IconButton>
        <Choice kind="switch" label="Private collection" onChange={change} />
      </DesignSystem>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(action).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("aria-busy"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Delete citation" }),
    ).toBeTruthy();
    const toggle = screen.getByRole("switch", { name: "Private collection" });
    fireEvent.click(toggle);
    expect(change).toHaveBeenCalledOnce();
    expect((toggle as HTMLInputElement).checked).toBe(true);
  });

  it("closes a disclosure on Escape or action selection and returns focus to its trigger", () => {
    const action = vi.fn();
    render(
      <DesignSystem variant="C">
        <ActionMenu label="Citation actions">
          <ActionButton onClick={action}>Copy citation</ActionButton>
        </ActionMenu>
      </DesignSystem>,
    );
    const trigger = screen.getByText("Citation actions");
    const disclosure = trigger.closest("details")!;
    const button = screen.getByRole("button", {
      name: "Copy citation",
      hidden: true,
    });
    disclosure.open = true;
    button.focus();
    fireEvent.keyDown(button, { key: "Escape" });
    expect(disclosure.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    disclosure.open = true;
    fireEvent.click(button);
    expect(action).toHaveBeenCalledOnce();
    expect(disclosure.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it("notifies a dialog close exactly once through its native close event", () => {
    // jsdom lacks modal APIs: emulate only open/close events, not browser focus.
    const prototype = HTMLDialogElement.prototype;
    const originalShow = Object.getOwnPropertyDescriptor(
      prototype,
      "showModal",
    );
    const originalClose = Object.getOwnPropertyDescriptor(prototype, "close");
    Object.defineProperties(prototype, {
      showModal: {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.open = true;
        },
      },
      close: {
        configurable: true,
        value(this: HTMLDialogElement) {
          if (this.open) {
            this.open = false;
            this.dispatchEvent(new Event("close"));
          }
        },
      },
    });
    try {
      const onClose = vi.fn();
      const { rerender } = render(
        <DesignSystem variant="A">
          <Dialog title="문장 삭제" open onClose={onClose}>
            삭제할까요?
          </Dialog>
        </DesignSystem>,
      );
      fireEvent.click(screen.getByRole("button", { name: "대화상자 닫기" }));
      expect(onClose).toHaveBeenCalledOnce();
      rerender(
        <DesignSystem variant="A">
          <Dialog title="문장 삭제" open={false} onClose={onClose}>
            삭제할까요?
          </Dialog>
        </DesignSystem>,
      );
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      cleanup();
      if (originalShow)
        Object.defineProperty(prototype, "showModal", originalShow);
      else Reflect.deleteProperty(prototype, "showModal");
      if (originalClose)
        Object.defineProperty(prototype, "close", originalClose);
      else Reflect.deleteProperty(prototype, "close");
    }
  });
});
