import type { MediaObject } from "#shared/contracts/media";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ListingPhotosSection } from "#client/features/businesses/components/listing-photos";

const { mockUsePhotosQuery, mockUploadPhotoMutate, mockDeletePhotoMutate } = vi.hoisted(() => ({
  mockUsePhotosQuery: vi.fn<() => unknown>(),
  mockUploadPhotoMutate: vi.fn<(_file: File, _opts?: unknown) => void>(),
  mockDeletePhotoMutate: vi.fn<(_id: string) => void>(),
}));

vi.mock("#client/features/businesses/hooks/photo-queries", () => ({
  useListingPhotosQuery: (_id: string) => mockUsePhotosQuery(),
  useUploadListingPhotoMutation: (_id: string) => ({
    mutate: mockUploadPhotoMutate,
    isPending: false,
    error: null,
  }),
  useDeleteListingPhotoMutation: (_id: string) => ({
    mutate: mockDeletePhotoMutate,
    isPending: false,
    error: null,
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const samplePhotos: MediaObject[] = [
  {
    id: "med_1",
    businessId: "biz_1",
    contentType: "image/jpeg",
    size: 102400,
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  },
  {
    id: "med_2",
    businessId: "biz_1",
    contentType: "image/png",
    size: 204800,
    status: "pending",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  },
];

describe("ListingPhotosSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(cleanup);

  it("renders active photos with images and pending photos with Uploading placeholder", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: samplePhotos },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);

    expect(screen.getByText("Listing photos")).toBeInTheDocument();
    expect(screen.getByAltText(/Listing visual 1 of 2/iu)).toBeInTheDocument();
    expect(screen.getByText("Uploading…")).toBeInTheDocument();
    expect(screen.getByText("Add photo")).toBeInTheDocument();
  });

  it("rejects 0-byte files with validation message", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: [] },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);
    const fileInput = screen.getByLabelText("Add photo");

    const emptyFile = new File([], "empty.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [emptyFile] } });

    expect(screen.getByText("That file is empty. Choose a photo.")).toBeInTheDocument();
    expect(mockUploadPhotoMutate).not.toHaveBeenCalled();
  });

  it("rejects files exceeding 8 MB size limit with validation message", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: [] },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);
    const fileInput = screen.getByLabelText("Add photo");

    const oversizedBuffer = new Uint8Array(9 * 1024 * 1024);
    const oversizedFile = new File([oversizedBuffer], "huge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(
      screen.getByText("That photo is larger than 8 MB. Choose a smaller one.")
    ).toBeInTheDocument();
    expect(mockUploadPhotoMutate).not.toHaveBeenCalled();
  });

  it("rejects unsupported MIME types with validation message", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: [] },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);
    const fileInput = screen.getByLabelText("Add photo");

    const gifFile = new File(["dummy"], "animation.gif", { type: "image/gif" });
    fireEvent.change(fileInput, { target: { files: [gifFile] } });

    expect(screen.getByText("Only JPEG, PNG, and WebP photos are supported.")).toBeInTheDocument();
    expect(mockUploadPhotoMutate).not.toHaveBeenCalled();
  });

  it("triggers upload mutation for valid photo file", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: [] },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);
    const fileInput = screen.getByLabelText("Add photo");

    const validFile = new File(["content"], "storefront.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(mockUploadPhotoMutate).toHaveBeenCalledWith(validFile, expect.any(Object));
  });

  it("enforces two-step delete confirmation toggle before calling delete mutation", () => {
    mockUsePhotosQuery.mockReturnValue({
      data: { items: [samplePhotos[0]] },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);

    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    expect(deleteBtn).toBeInTheDocument();

    // First click: changes text to "Confirm?"
    fireEvent.click(deleteBtn);
    expect(screen.getByRole("button", { name: "Confirm?" })).toBeInTheDocument();
    expect(mockDeletePhotoMutate).not.toHaveBeenCalled();

    // Second click: triggers delete mutation
    fireEvent.click(screen.getByRole("button", { name: "Confirm?" }));
    expect(mockDeletePhotoMutate).toHaveBeenCalledWith("med_1");
  });

  it("hides Add photo button when photo limit is reached", () => {
    const fullPhotos: MediaObject[] = Array.from({ length: 10 }, (_, i) => ({
      id: `med_${i + 1}`,
      businessId: "biz_1",
      contentType: "image/jpeg",
      size: 102400,
      status: "active",
      createdAt: new Date(),
    }));

    mockUsePhotosQuery.mockReturnValue({
      data: { items: fullPhotos },
      isPending: false,
      error: null,
    });

    renderWithClient(<ListingPhotosSection businessId="biz_1" />);

    expect(screen.queryByText("Add photo")).not.toBeInTheDocument();
    expect(screen.getByText(/This listing has the maximum of 10 photos/iu)).toBeInTheDocument();
  });
});
