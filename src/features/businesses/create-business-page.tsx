import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "#client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#client/components/ui/card";
import { uenField } from "#shared/contracts/business";

import {
  LISTING_FIELD_DEFS,
  ListingField,
  PaymentOptionsField,
  emptyListingValues,
  listingPayload,
} from "./components/listing-form-fields";
import { BusinessesPageGates } from "./components/page-gates";
import { useCreateBusinessMutation } from "./hooks/business-queries";

export function CreateBusinessPage() {
  useEffect(() => {
    document.title = "Add your business — LocaLoco";
  }, []);

  const createBusinessMutation = useCreateBusinessMutation();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { uen: "", ...emptyListingValues },
    onSubmit: ({ value }) => {
      createBusinessMutation.mutate(
        { uen: value.uen, listing: listingPayload(value) },
        {
          onSuccess: created => {
            void navigate({ to: "/businesses/$id", params: { id: created.id } });
          },
        }
      );
    },
  });

  const pendingMutation = createBusinessMutation.isPending;

  return (
    <BusinessesPageGates>
      <main className="flex items-start justify-center p-6">
        <Card className="mt-16 w-full max-w-xl">
          <CardHeader>
            <CardTitle>
              <h1 className="font-display text-xl tracking-tight">Add your business</h1>
            </CardTitle>
            <CardDescription>
              Share your business and its opening listing. You can edit the listing any time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={e => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field
                name="uen"
                validators={{
                  onChange: ({ value }) =>
                    value.trim().length === 0
                      ? "UEN is required"
                      : uenField.safeParse(value).success
                        ? undefined
                        : "Enter a valid Singapore UEN",
                }}
              >
                {field => (
                  <ListingField
                    id="uen"
                    label="UEN"
                    type="text"
                    maxLength={10}
                    disabled={pendingMutation}
                    placeholder="e.g. 201800111A"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    error={field.state.meta.errors[0]}
                  />
                )}
              </form.Field>

              {LISTING_FIELD_DEFS.map(def => (
                <form.Field
                  key={def.name}
                  name={def.name}
                  validators={
                    def.required
                      ? {
                          onChange: ({ value }) =>
                            value.trim().length === 0 ? "Required" : undefined,
                        }
                      : undefined
                  }
                >
                  {field => (
                    <ListingField
                      id={def.name}
                      label={def.label}
                      type={def.type}
                      placeholder={def.placeholder}
                      optional={def.optional}
                      maxLength={def.maxLength}
                      disabled={pendingMutation}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                  )}
                </form.Field>
              ))}

              <form.Field name="paymentOptions">
                {field => (
                  <PaymentOptionsField
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={pendingMutation}
                  />
                )}
              </form.Field>

              {createBusinessMutation.error ? (
                <p className="text-destructive text-sm">{createBusinessMutation.error.message}</p>
              ) : null}

              <Button type="submit" className="w-full" disabled={pendingMutation}>
                {pendingMutation ? "Adding…" : "Add business"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </BusinessesPageGates>
  );
}
