"use client";

// * Types
import type { RequestOptions } from "../types.ts";

// * Hooks
import {
  type ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useRef,
  useState,
} from "react";

// * Components
import {
  Fieldset,
  IFrame,
  Input,
  Search,
  SearchOption,
  Select,
  SelectOption,
} from "@andrilla/mado-ui/components";
import DocumentOnClipboard from "@andrilla/react-sf/document.on.clipboard";
import Cube from "@andrilla/react-sf/cube";
import MotorcycleFill from "@andrilla/react-sf/motorcycle.fill";
import ProgressIndicator from "@andrilla/react-sf/progress.indicator";
import ArrowTrianglehead2ClockwiseRotate90Circle from "@andrilla/react-sf/arrow.trianglehead.2.clockwise.rotate.90.circle";
import ArrowTrianglehead2ClockwiseRotate90CircleFill from "@andrilla/react-sf/arrow.trianglehead.2.clockwise.rotate.90.circle.fill";

// * Lib
import { symbolNameList } from "../lib/symbol-name-list.ts";

// * Utils
import { wait } from "../utils/wait.ts";
function toKebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

const BASE_URL = "http://localhost:8000";

const optionKeyList: (keyof RequestOptions)[] = [
  "bg",
  "fill",
  "fm",
  "h",
  "p",
  "size",
  "stroke",
  "strokeW",
  "symbolName",
  "w",
  "weight",
];

const starterSearchOptionList: string[] = [
  "app",
  "arrow",
  "bell",
  "bolt",
  "bubble",
  "calendar",
  "capsule",
  "checkmark",
  "chevron",
  "circle",
  "clipboard",
  "desktop",
  "diamond",
  "display",
  "document",
  "ellipsis",
  "envelope",
  "exclamationpoint",
  "figure",
  "flag",
  "folder",
  "gear",
  "hand",
  "heart",
  "hexagon",
  "house",
  "key",
  "laptop",
  "lock",
  "magnifyingglass",
  "octagon",
  "oval",
  "page",
  "pencil",
  "person",
  "phone",
  "photo",
  "rectangle",
  "seal",
  "shield",
  "slash",
  "star",
  "square",
  "tag",
  "triangle",
  "tv",
  "questionmark",
  "xmark",
];

export function SFSymbolURLGenerator() {
  const [symbolName, setSymbolName] = useState("cube");

  const [options, setOptions] = useState<Partial<RequestOptions>>({
    symbolName: "cube",
  });

  const [loadingSearch, setLoadingSearch] = useState(false);

  const [searchOptionList, setSearchOptionList] = useState<
    typeof symbolNameList
  >(starterSearchOptionList);

  const [loadingIFrame, setLoadingIFrame] = useState<
    false | "enter" | "stable" | "leave"
  >(false);

  const constructSrc = () => {
    if (options.symbolName && !symbolNameList.includes(options.symbolName)) {
      options.symbolName = "xmark.octagon";
    }

    const searchParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (key === "symbolName") return;

      key = toKebabCase(key).toLowerCase();

      if (value) searchParams.set(key, `${value}`);
    });

    return `${BASE_URL}/${options.symbolName || "cube"}${
      searchParams.size > 0 ? "?" : ""
    }${searchParams.toString()}`;
  };

  const src = constructSrc();

  const inputAndControllerRef = useRef<{
    controller: AbortController;
    input: HTMLInputElement;
  }>(null);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const { currentTarget } = e,
      { name, value } = currentTarget;

    if (!optionKeyList.includes(name as keyof RequestOptions)) {
      console.error(`name is not a valid option key: ${name}`);
      return;
    }

    if (
      inputAndControllerRef.current &&
      inputAndControllerRef.current.input === currentTarget
    ) {
      inputAndControllerRef.current.controller.abort();
    } else {
      setLoadingIFrame("enter");
      setTimeout(() => setLoadingIFrame("stable"), 1000);
    }

    const controller = new AbortController();
    inputAndControllerRef.current = { controller, input: currentTarget };

    try {
      await wait(1000, controller.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }

    if (inputAndControllerRef.current.controller !== controller) return;

    setOptions((previous) => ({ ...previous, [name]: value }));
    setLoadingIFrame("leave");
    setTimeout(() => setLoadingIFrame(false), 1000);
    inputAndControllerRef.current = null;
  };

  const handleSelectChange = (value: string, name: keyof RequestOptions) =>
    setOptions((previous) => ({ ...previous, [name]: value }));

  const handleSearch: KeyboardEventHandler<HTMLInputElement> = async (e) => {
    const { currentTarget } = e,
      rawValue = currentTarget.value,
      value = rawValue.trim().toLowerCase();

    if (value === symbolName) return;

    setSymbolName(value);

    if (
      inputAndControllerRef.current &&
      inputAndControllerRef.current.input === currentTarget
    ) {
      inputAndControllerRef.current.controller.abort();
    } else {
      setLoadingSearch(true);
    }

    const controller = new AbortController();
    inputAndControllerRef.current = { controller, input: currentTarget };

    try {
      await wait(1000, controller.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }

    if (inputAndControllerRef.current?.controller !== controller) return;

    const seedList = value.length > 0
      ? starterSearchOptionList.filter((starter) => starter.includes(value))
      : starterSearchOptionList;

    const filteredList = symbolNameList.filter((name) =>
      seedList.some((starter) => name.includes(starter))
    ).sort((a, b) => a.localeCompare(b));

    setSearchOptionList(filteredList.length > 0 ? filteredList : seedList);

    setLoadingSearch(false);
    inputAndControllerRef.current = null;
  };

  const resetColor: MouseEventHandler<HTMLButtonElement> = (e) => {
    const { currentTarget } = e,
      { previousElementSibling } = currentTarget;

    if (!previousElementSibling) return;

    const { name } = previousElementSibling as HTMLInputElement;

    setOptions((previous) => ({ ...previous, [name]: undefined }));
  };

  const copyToClipboard = () => navigator.clipboard.writeText(src);

  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:gap-12">
      <div className="grid h-fit gap-3">
        <Search
          name="symbolName"
          label="Symbol Name"
          placeholder="Search symbol name"
          description="Select one of the starter symbol names to find some symbols, though you may need to use the SF Symbols app to find the symbol you're looking for."
          descriptionProps={{ className: "max-w-none" }}
          allowCustom
          inputProps={{
            onKeyDown: handleSearch,
          }}
          onChange={(value: string | string[] | null) =>
            handleSelectChange(
              Array.isArray(value) ? value[0] : value || "",
              "symbolName",
            )}
        >
          {loadingSearch
            ? (
              <SearchOption name="loading" value="loading" disabled>
                <ProgressIndicator className="animate-spin size-4.5" />
                Searching…
              </SearchOption>
            )
            : (
              searchOptionList.map((name) => (
                <SearchOption key={name} name={name} value={name}>
                  <img
                    src={`/${name}?&w=16`}
                    alt={name.split(".").join(" ")}
                    className="size-4"
                    height={16}
                    loading="lazy"
                    width={16}
                  />
                  {name}
                </SearchOption>
              ))
            )}
        </Search>

        <Select
          name="fm"
          label="Format"
          defaultValue="svg"
          onChange={(value: string) => handleSelectChange(value, "fm")}
        >
          <SelectOption name="SVG" value="svg">
            <img
              src="/cube?fm=svg&w=16"
              alt="Cube SVG"
              className="size-4"
              height={16}
              loading="lazy"
              width={16}
            />
            SVG
          </SelectOption>

          <SelectOption name="PNG" value="png">
            <img
              src="/cube?fm=png&w=16"
              alt="Cube PNG"
              className="size-4 dark:invert object-contain"
              height={16}
              loading="lazy"
              width={16}
            />
            PNG
          </SelectOption>

          <SelectOption name="WebP" value="webp">
            <img
              src="/cube?fm=webp&w=16"
              alt="Cube WebP"
              className="size-4 dark:invert object-contain"
              height={16}
              loading="lazy"
              width={16}
            />
            WebP
          </SelectOption>

          <SelectOption name="JPG" value="jpg">
            <img
              src="/cube?fm=jpg&w=16&bg=fff"
              alt="Cube JPG"
              className="size-4 dark:invert object-contain"
              height={16}
              loading="lazy"
              width={16}
            />
            JPG
          </SelectOption>
        </Select>

        <Fieldset
          className="grid grid-cols-2 gap-(--tw-gap)"
          legend="Options"
          legendProps={{ className: "col-span-2" }}
        >
          <Select
            name="size"
            label="Size"
            defaultValue="small"
            onChange={(value: string) => handleSelectChange(value, "size")}
          >
            <SelectOption name="Small" value="small">
              <img
                src="/cube?size=small&w=16"
                alt="Cube Small"
                className="size-4"
                height={16}
                loading="lazy"
                width={16}
              />
              Small
            </SelectOption>

            <SelectOption name="Medium" value="medium">
              <img
                src="/cube?size=medium&w=16"
                alt="Cube Medium"
                className="size-4"
                height={16}
                loading="lazy"
                width={16}
              />
              Medium
            </SelectOption>

            <SelectOption name="Large" value="large">
              <img
                src="/cube?size=large&w=16"
                alt="Cube Large"
                className="size-4"
                height={16}
                loading="lazy"
                width={16}
              />
              Large
            </SelectOption>
          </Select>

          <Select
            name="weight"
            label="Weight"
            defaultValue="regular"
            onChange={(value: string) => handleSelectChange(value, "weight")}
          >
            <SelectOption
              name="Ultralight"
              value="ultralight"
              className="font-extralight"
              selectedDisplayProps={{ className: "font-extralight" }}
            >
              <Cube className="size-4" weight="ultralight" />
              Ultralight
            </SelectOption>

            <SelectOption
              name="Thin"
              value="thin"
              className="font-thin"
              selectedDisplayProps={{ className: "font-thin" }}
            >
              <Cube className="size-4" weight="thin" />
              Thin
            </SelectOption>

            <SelectOption
              name="Light"
              value="light"
              className="font-light"
              selectedDisplayProps={{ className: "font-light" }}
            >
              <Cube className="size-4" weight="light" />
              Light
            </SelectOption>

            <SelectOption
              name="Regular"
              value="regular"
              className="font-regular"
              selectedDisplayProps={{ className: "font-regular" }}
            >
              <Cube className="size-4" weight="regular" />
              Regular
            </SelectOption>

            <SelectOption
              name="Medium"
              value="medium"
              className="font-medium"
              selectedDisplayProps={{ className: "font-medium" }}
            >
              <Cube className="size-4" weight="medium" />
              Medium
            </SelectOption>

            <SelectOption
              name="Semibold"
              value="semibold"
              className="font-semibold"
              selectedDisplayProps={{ className: "font-semibold" }}
            >
              <Cube className="size-4" weight="semibold" />
              Semibold
            </SelectOption>

            <SelectOption
              name="Bold"
              value="bold"
              className="font-bold"
              selectedDisplayProps={{ className: "font-bold" }}
            >
              <Cube className="size-4" weight="bold" />
              Bold
            </SelectOption>

            <SelectOption
              name="Heavy"
              value="heavy"
              className="font-extrabold"
              selectedDisplayProps={{ className: "font-extrabold" }}
            >
              <Cube className="size-4" weight="heavy" />
              Heavy
            </SelectOption>

            <SelectOption
              name="Black"
              value="black"
              className="font-black"
              selectedDisplayProps={{ className: "font-black" }}
            >
              <Cube className="size-4" weight="black" />
              Black
            </SelectOption>
          </Select>
        </Fieldset>

        <Fieldset
          className="grid grid-cols-2 gap-(--tw-gap)"
          legend="Dimensions"
          legendProps={{ className: "col-span-2" }}
        >
          <Input
            name="w"
            label="Width"
            inputMode="numeric"
            min={0}
            onChange={handleInputChange}
            placeholder="64"
            required={false}
            type="number"
          />

          <Input
            name="h"
            label="Height"
            inputMode="numeric"
            min={0}
            onChange={handleInputChange}
            placeholder="64"
            required={false}
            type="number"
          />
        </Fieldset>

        <Input
          name="p"
          label="Padding"
          inputMode="numeric"
          min={0}
          onChange={handleInputChange}
          placeholder="64"
          required={false}
          type="number"
        />

        <Fieldset
          className="grid grid-cols-2 gap-(--tw-gap) sm:grid-cols-4"
          legend="Colors"
          legendProps={{ className: "col-span-2 sm:col-span-4" }}
        >
          <Input
            name="fill"
            label="Fill"
            className="size-12 overflow-clip rounded-full p-0 [&::-webkit-color-swatch-wrapper]:p-0 cursor-pointer pointer-fine:hover:scale-105 pointer-fine:active:scale-95 active:scale-95 transition-transform duration-300 ease-spring"
            defaultValue="#00000000"
            fieldProps={{ className: "[&>div]:w-fit" }}
            onChange={handleInputChange}
            required={false}
            type="color"
          >
            <button
              className="group/button grid size-5 rounded-full left-1/2 -translate-x-1/2 pointer-fine:hover:rotate-[-.125turn] pointer-fine:active:rotate-[1.25turn] active:rotate-[1.25turn] transition-transform duration-300 ease-spring"
              onClick={resetColor}
              title="Reset Color"
              type="button"
            >
              <ArrowTrianglehead2ClockwiseRotate90Circle
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-0"
                weight="light"
              />

              <ArrowTrianglehead2ClockwiseRotate90CircleFill
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-100 opacity-0"
                weight="light"
              />
            </button>
          </Input>

          <Input
            name="bg"
            label="Background"
            className="size-12 overflow-clip rounded-full p-0 [&::-webkit-color-swatch-wrapper]:p-0 cursor-pointer pointer-fine:hover:scale-105 pointer-fine:active:scale-95 active:scale-95 transition-transform duration-300 ease-spring"
            defaultValue="#00000000"
            fieldProps={{ className: "[&>div]:w-fit" }}
            onChange={handleInputChange}
            required={false}
            type="color"
          >
            <button
              className="group/button grid size-5 rounded-full left-1/2 -translate-x-1/2 pointer-fine:hover:rotate-[-.125turn] pointer-fine:active:rotate-[1.25turn] active:rotate-[1.25turn] transition-transform duration-300 ease-spring"
              onClick={resetColor}
              title="Reset Color"
              type="button"
            >
              <ArrowTrianglehead2ClockwiseRotate90Circle
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-0"
                weight="light"
              />

              <ArrowTrianglehead2ClockwiseRotate90CircleFill
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-100 opacity-0"
                weight="light"
              />
            </button>
          </Input>

          <Input
            name="stroke"
            label="Stroke"
            className="size-12 overflow-clip rounded-full p-0 [&::-webkit-color-swatch-wrapper]:p-0 cursor-pointer pointer-fine:hover:scale-105 pointer-fine:active:scale-95 active:scale-95 transition-transform duration-300 ease-spring"
            defaultValue="#00000000"
            fieldProps={{ className: "[&>div]:w-fit" }}
            onChange={handleInputChange}
            required={false}
            type="color"
          >
            <button
              className="group/button grid size-5 rounded-full left-1/2 -translate-x-1/2 pointer-fine:hover:rotate-[-.125turn] pointer-fine:active:rotate-[1.25turn] active:rotate-[1.25turn] transition-transform duration-300 ease-spring"
              onClick={resetColor}
              title="Reset Color"
              type="button"
            >
              <ArrowTrianglehead2ClockwiseRotate90Circle
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-0"
                weight="light"
              />

              <ArrowTrianglehead2ClockwiseRotate90CircleFill
                className="size-full col-start-1 row-start-1 transition-opacity duration-300 ease-exponential pointer-fine:group-hover/button:opacity-100 opacity-0"
                weight="light"
              />
            </button>
          </Input>

          <Input
            name="strokeW"
            label="Stroke Width"
            inputMode="numeric"
            min={0}
            onChange={handleInputChange}
            placeholder="1"
            required={false}
            type="number"
          />
        </Fieldset>
      </div>

      <div>
        <figure className="pbe-2">
          <figcaption className="pbe-1 text-center text-xs font-medium">
            Generated SF Symbol Display
          </figcaption>

          <div
            {...(loadingIFrame !== false ? { "aria-busy": true } : {})}
            {...(loadingIFrame === "enter" ? { "data-enter": "" } : {})}
            {...(loadingIFrame === "stable" ? { "data-stable": "" } : {})}
            {...(loadingIFrame === "leave" ? { "data-leave": "" } : {})}
            className="group/container border-primary-800/50 aspect-square w-full overflow-clip rounded-xl border bg-white"
          >
            <IFrame
              src={src}
              title="Generated SF Symbol Display"
              className="ease-exponential aspect-auto size-full bg-none transition-opacity duration-500 group-aria-busy/container:opacity-25"
            />

            <MotorcycleFill className="fill-primary-500 ease-spring group-data-stable/container:animate-sway absolute top-1/2 left-1/2 w-16 origin-bottom-left -translate-x-132 -translate-y-1/2 -rotate-40 opacity-0 transition-transform duration-1000 group-data-enter/container:-translate-x-1/2 group-data-enter/container:opacity-100 group-data-leave/container:translate-x-132 group-data-leave/container:opacity-100 group-data-leave/container:ease-in group-data-stable/container:-translate-x-1/2 group-data-stable/container:rotate-0 group-data-stable/container:opacity-100" />
          </div>
        </figure>

        <button
          className="bg-primary-50/5 ease-spring mx-auto rounded-lg border p-2 text-sm leading-none wrap-anywhere transition-transform duration-300 active:scale-95 pointer-fine:hover:scale-105 pointer-fine:active:scale-95"
          onClick={copyToClipboard}
          type="button"
        >
          {src}
          <DocumentOnClipboard className="h-3.5 shrink-0" />
        </button>
      </div>
    </div>
  );
}
